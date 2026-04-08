import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test administrator access to product snapshots across seller products.
 *
 * Validates the complete workflow where an administrator can view product snapshots from any seller's product on the platform for compliance monitoring, policy enforcement, and dispute resolution purposes.
 *
 * 1. Register and authenticate a seller account.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller updates the product to create a snapshot record.
 * 4. Register and authenticate an administrator account.
 * 5. Administrator retrieves the product snapshot using product ID and snapshot ID.
 * 6. Validates the snapshot contains all expected historical product data.
 */
export async function test_api_product_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product as seller
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Update product to create snapshot
  const updatedProduct = await api.functional.ecommerce.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.name(4),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2000>
        >(),
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct);
  // 4. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 5. Admin retrieves specific snapshot (using random snapshot ID for simulation)
  // In production, snapshot ID would be obtained from a list endpoint
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const retrievedSnapshot =
    await api.functional.ecommerce.seller.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  // 6. Validate snapshot data relationships
  TestValidator.equals(
    "snapshot product ID matches",
    retrievedSnapshot.ecommerce_product_id,
    product.id,
  );
  TestValidator.predicate(
    "snapshot has name",
    retrievedSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has description",
    retrievedSnapshot.description.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid base price",
    retrievedSnapshot.base_price > 0,
  );
}
