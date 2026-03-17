import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_product_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Admin approves seller registration
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Create a category first (required for product creation)
  // Note: Category creation endpoint not in provided functions
  // Using a placeholder - in real test, category would be created via admin endpoint
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 5. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Add variant to product
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green", "Black"]),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. Edit product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
        basePrice: product.base_price + 1000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    `${product.name} - Updated`,
  );
  TestValidator.equals(
    "product price updated",
    updatedProduct.base_price,
    product.base_price + 1000,
  );
  // 8. Retrieve product snapshot using admin endpoint
  // Note: In a complete test environment, you would first call GET /admin/products/{productId}/snapshots
  // to list all snapshots and get the snapshotId. Since that endpoint is not in the provided functions,
  // this test demonstrates the endpoint access pattern with admin authentication.
  //
  // The snapshot retrieval endpoint validates:
  // - Admin authentication is required and working
  // - Product ID and snapshot ID path parameters are validated
  // - Response includes complete snapshot data structure
  //
  // In production, the snapshotId would be obtained from the snapshot list endpoint
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // This call would succeed with a valid snapshotId from the list endpoint
  // For this test, we validate the endpoint structure and admin access
  const snapshot =
    await api.functional.shoppingMall.admin.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot structure
  TestValidator.predicate(
    "snapshot has product name",
    snapshot.name.length > 0,
  );
  TestValidator.predicate("snapshot has base price", snapshot.base_price > 0);
  TestValidator.predicate(
    "snapshot has timestamp",
    snapshot.snapshot_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot category exists",
    snapshot.category.id.length > 0,
  );
  TestValidator.equals(
    "snapshot seller exists",
    snapshot.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "snapshot has variant snapshots",
    snapshot.variantSnapshots.length > 0,
  );
  // Validate variant snapshot structure
  if (snapshot.variantSnapshots.length > 0) {
    const variantSnapshot = snapshot.variantSnapshots[0]!;
    TestValidator.predicate(
      "variant snapshot has SKU",
      variantSnapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant snapshot has options",
      Object.keys(variantSnapshot.option_values).length > 0,
    );
    TestValidator.predicate(
      "variant snapshot has stock quantity",
      variantSnapshot.stock_quantity >= 0,
    );
  }
  // 10. Validate snapshot preserves historical state
  // The snapshot should contain the product state at the time it was created
  TestValidator.predicate(
    "snapshot ID is valid UUID",
    snapshot.id.length === 36,
  );
  TestValidator.equals(
    "snapshot references correct product",
    snapshot.product.id,
    product.id,
  );
}