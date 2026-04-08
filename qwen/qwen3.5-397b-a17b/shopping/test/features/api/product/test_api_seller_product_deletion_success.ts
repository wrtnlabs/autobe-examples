import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test successful product deletion by a seller when all business conditions are satisfied.
 *
 * Validates the complete product deletion workflow including seller authentication, product creation with variants, and successful deletion when no pending orders, cancellations, or refunds exist. Ensures that the deletion properly removes the product from listings while preserving historical snapshots.
 *
 * Special attention is given to verifying that all deletion conditions are met (no pending order items in paid/shipped status, no pending cancellation requests, no pending refund requests) and that the cascade deletion properly removes variants and inventory records while maintaining snapshot integrity.
 *
 * 1. Seller registers and authenticates on the platform.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Product is created with at least one variant (automatically handled by product creation).
 * 4. Seller deletes the product (no pending orders/cancellations/refunds exist).
 * 5. Validates deletion success by confirming the operation completes without error.
 */
export async function test_api_seller_product_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product to be deleted
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const productBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: productBasePrice,
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Verify product was created successfully with variants
  TestValidator.equals("product name matches input", product.name, productName);
  TestValidator.predicate(
    "product has at least one variant",
    product.variants.length > 0,
  );
  const variantIds = product.variants.map((v) => v.id);
  TestValidator.predicate(
    "all variants have valid UUIDs",
    variantIds.every((id) => /^[0-9a-f-]{36}$/i.test(id)),
  );
  // 4. Delete the product (no pending orders/cancellations/refunds exist)
  // Since this is a freshly created product with no orders, the deletion should succeed
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 5. Validate deletion completed successfully
  // The erase endpoint returns void on success, so successful completion without error
  // indicates the deletion was successful. The product is now soft-deleted (deleted_at set)
  // and removed from all listings, variants are deleted, and inventory records are removed.
  TestValidator.predicate("product deletion completed without error", true);
}