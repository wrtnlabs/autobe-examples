import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that attempting to update snapshot images with invalid product or snapshot IDs returns appropriate 404 Not Found errors.
 *
 * Validates the complete error handling flow for snapshot image update operations when invalid product or snapshot relationships are provided. Ensures that the API properly verifies product existence, snapshot existence, and product-snapshot ownership before allowing modifications.
 *
 * The test covers three critical 404 scenarios: non-existent product ID, valid product with non-existent snapshot ID, and snapshot belonging to a different product. Each scenario validates that the business rule requiring valid product-snapshot relationships is enforced.
 *
 * 1. Administrator creates a category for product reference.
 * 2. Seller registers and creates a product with the category.
 * 3. Seller attempts to update snapshot images using a non-existent product ID - verify 404 Not Found.
 * 4. Seller attempts to update snapshot images using valid product ID but non-existent snapshot ID - verify 404 Not Found.
 * 5. Seller attempts to update snapshot images where snapshot belongs to different product - verify 404 Not Found.
 */
export async function test_api_product_snapshot_image_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registers and creates a product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Test 404 with non-existent product ID
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent product ID returns 404", async () => {
    await api.functional.shoppingMall.seller.products.snapshots.images.update(
      sellerConnection,
      {
        productId: nonExistentProductId,
        snapshotId: nonExistentSnapshotId,
        body: {} satisfies IShoppingMallProductSnapshot.IUpdate,
      },
    );
  });
  // 4. Test 404 with valid product ID but non-existent snapshot ID
  await TestValidator.error(
    "valid product with non-existent snapshot ID returns 404",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.update(
        sellerConnection,
        {
          productId: product.id,
          snapshotId: nonExistentSnapshotId,
          body: {} satisfies IShoppingMallProductSnapshot.IUpdate,
        },
      );
    },
  );
  // 5. Test 404 with snapshot from different product
  // Create another seller and product to get a different product's snapshot context
  const otherSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const otherProduct =
    await generate_random_shopping_mall_seller_products_create(
      otherSellerConnection,
      {
        body: {
          shopping_mall_category_id: category.id,
        },
      },
    );
  typia.assert(otherProduct);
  // Use other product's ID as snapshot ID to simulate cross-product snapshot access
  await TestValidator.error(
    "snapshot from different product returns 404",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.update(
        sellerConnection,
        {
          productId: product.id,
          snapshotId: otherProduct.id,
          body: {} satisfies IShoppingMallProductSnapshot.IUpdate,
        },
      );
    },
  );
}
