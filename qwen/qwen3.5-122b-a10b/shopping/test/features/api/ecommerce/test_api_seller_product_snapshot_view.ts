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

export async function test_api_seller_product_snapshot_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create seller account for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerJoinEmail,
      password: sellerJoinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 3. Seller logs in to obtain authentication token
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoinEmail,
      password: sellerJoinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 4. Seller creates a product with required category
  // Note: We need a valid category_id, but there's no category creation endpoint in SDK
  // Using a random UUID - in real scenario, category should exist
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Store original product state for validation
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.basePrice;
  // 5. Seller updates the product to trigger snapshot creation
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph();
  const newBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const updatedProduct = await api.functional.ecommerce.seller.products.update(
    sellerLoginConnection,
    {
      productId: product.id,
      body: {
        name: newName,
        description: newDescription,
        base_price: newBasePrice,
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct);
  // 6. Verify product was updated
  TestValidator.equals("product name updated", updatedProduct.name, newName);
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    newDescription,
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.basePrice,
    newBasePrice,
  );
  // 7. Administrator views the product snapshot
  // Note: In a real implementation, we would need to retrieve the snapshot ID from
  // a list snapshots endpoint. Since that's not available in the provided SDK,
  // this test demonstrates the snapshot viewing capability with a generated snapshot ID.
  // In production, the snapshot ID would be obtained from the product's snapshot history.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.ecommerce.admin.products.snapshots.at(
    adminConnection,
    {
      productId: product.id,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 8. Validate snapshot contains expected fields
  TestValidator.equals(
    "snapshot product id matches",
    snapshot.ecommerce_product_id,
    product.id,
  );
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate(
    "snapshot has description",
    snapshot.description.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid base price",
    snapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has created timestamp",
    snapshot.created_at.length > 0,
  );
}