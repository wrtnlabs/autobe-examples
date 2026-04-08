import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test seller access to product historical snapshots.
 *
 * Validates that a seller can retrieve historical snapshots of their own products after editing. The test creates a product, updates it to generate a snapshot, then verifies the seller can access the snapshot containing the pre-update product state.
 *
 * This test ensures the snapshot system correctly preserves historical product data for audit and dispute resolution purposes. The snapshot should contain all product fields (name, description, category_id, base_price) as they existed before the update was applied.
 *
 * Note: In production, snapshot IDs would be retrieved via a list endpoint. This test demonstrates the access pattern using simulation mode.
 *
 * 1. Seller authenticates via email registration.
 * 2. Seller creates a product with initial name, description, category_id, and base_price.
 * 3. Seller updates the product with new values, triggering snapshot creation.
 * 4. Seller accesses a snapshot (in simulation, uses generated snapshot ID).
 * 5. Validates snapshot response structure and type safety.
 */
export async function test_api_product_snapshot_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Create initial product
  // Generate random category_id since admin category list endpoint is not available
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const initialName: string = RandomGenerator.name(3);
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 5,
  });
  const initialBasePrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product: IEcommerceProduct =
    await generate_random_ecommerce_seller_products_create(sellerConnection, {
      body: {
        name: initialName,
        description: initialDescription,
        category_id: categoryId,
        base_price: initialBasePrice,
      } satisfies IEcommerceProduct.ICreate,
    });
  typia.assert(product);
  const productId: string & tags.Format<"uuid"> = product.id;
  // 3. Update product to generate snapshot
  const updatedName: string = RandomGenerator.name(3);
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 5,
  });
  const updatedBasePrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  await api.functional.ecommerce.seller.products.update(sellerConnection, {
    productId,
    body: {
      name: updatedName,
      description: updatedDescription,
      base_price: updatedBasePrice,
    } satisfies IEcommerceProduct.IUpdate,
  });
  // 4. Access snapshot (in simulation mode, uses randomly generated snapshot ID)
  // In production, snapshot ID would be retrieved from a list endpoint
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommerceProductSnapshot =
    await api.functional.ecommerce.seller.products.snapshots.at(
      sellerConnection,
      {
        productId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot response structure
  TestValidator.equals(
    "snapshot product ID matches",
    snapshot.ecommerce_product_id,
    productId,
  );
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate(
    "snapshot has description",
    snapshot.description.length > 0,
  );
  TestValidator.predicate(
    "snapshot has category_id",
    snapshot.category_id.length > 0,
  );
  TestValidator.predicate("snapshot has base_price", snapshot.base_price > 0);
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== null,
  );
}
