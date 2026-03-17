import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_snapshot_admin_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
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
  // 2. Create and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create a product through the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Edit the product multiple times to generate snapshots
  const editCount = 3;
  const updatedProducts: IShoppingMallProduct[] = [];
  for (let i = 0; i < editCount; i++) {
    const updatedProduct =
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId: product.id,
          body: {
            name: `${RandomGenerator.paragraph({ sentences: 1 })} - Edit ${i + 1}`,
            basePrice:
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1000>
              >() +
              i * 100,
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    typia.assert(updatedProduct);
    updatedProducts.push(updatedProduct);
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 5. Call the admin snapshot list endpoint
  const snapshotResponse =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 6. Verify pagination metadata
  TestValidator.predicate(
    "pagination exists",
    snapshotResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is set",
    snapshotResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshotResponse.pagination.pages >= 0,
  );
  // 7. Verify snapshot data array exists
  TestValidator.predicate(
    "snapshot data array exists",
    Array.isArray(snapshotResponse.data),
  );
  // 8. Validate each snapshot contains required fields (typia.assert validates types)
  for (const snapshot of snapshotResponse.data) {
    typia.assert(snapshot);
    // Validate base_price is positive number (business logic, not type)
    TestValidator.predicate("base_price is positive", snapshot.base_price > 0);
    // Validate snapshot_at is valid parseable date (business logic)
    TestValidator.predicate(
      "snapshot_at is valid date",
      !isNaN(Date.parse(snapshot.snapshot_at)),
    );
    // Validate category information exists (typia ensures structure)
    TestValidator.predicate("category exists", snapshot.category !== undefined);
    TestValidator.predicate(
      "category name exists",
      snapshot.category.name.length > 0,
    );
    // Validate seller information exists (typia ensures structure)
    TestValidator.predicate("seller exists", snapshot.seller !== undefined);
    TestValidator.predicate(
      "seller shop_name exists",
      snapshot.seller.shop_name.length > 0,
    );
  }
  // 9. Verify snapshots are ordered chronologically (most recent first)
  if (snapshotResponse.data.length >= 2) {
    for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
      const currentSnapshot = snapshotResponse.data[i];
      const nextSnapshot = snapshotResponse.data[i + 1];
      TestValidator.predicate(
        `snapshot ${i} is newer than snapshot ${i + 1}`,
        new Date(currentSnapshot.snapshot_at).getTime() >=
          new Date(nextSnapshot.snapshot_at).getTime(),
      );
    }
  }
  // 10. Verify snapshot count matches number of edits
  TestValidator.equals(
    "snapshot count matches edit count",
    snapshotResponse.pagination.records,
    editCount,
  );
  TestValidator.equals(
    "snapshot data array length matches edit count",
    snapshotResponse.data.length,
    editCount,
  );
}
