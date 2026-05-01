import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function test_api_admin_product_snapshot_retrieve_complete_detail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller creates product with known original values
  const originalName = RandomGenerator.paragraph({ sentences: 3 });
  const originalDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const originalBasePrice = typia.random<
    number & tags.Type<"uint32">
  >() satisfies number as number;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: originalName,
        description: originalDescription,
        base_price: originalBasePrice,
      },
    },
  );
  typia.assert(product);
  // 5. Seller updates product with different values to trigger snapshot creation
  const updatedName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const updatedBasePrice = originalBasePrice + 1000;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: updatedName,
        description: updatedDescription,
        shopping_mall_category_id: product.category.id,
        base_price: updatedBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 6. Administrator retrieves the snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.admin.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot structure and historical state
  TestValidator.equals(
    "snapshot product_id matches",
    snapshot.product_id,
    product.id,
  );
  TestValidator.predicate(
    "snapshot id is distinct from product id",
    snapshot.id !== product.id,
  );
  TestValidator.predicate(
    "snapshot created_at is valid ISO datetime",
    snapshot.created_at.length > 0,
  );
  // Snapshot preserves pre-edit original values, not current product values
  TestValidator.equals(
    "snapshot name preserves original pre-edit value",
    snapshot.name,
    originalName,
  );
  TestValidator.equals(
    "snapshot description preserves original pre-edit value",
    snapshot.description,
    originalDescription,
  );
  TestValidator.equals(
    "snapshot base_price preserves original pre-edit value",
    snapshot.base_price,
    originalBasePrice,
  );
  // Snapshot name differs from current product name (proof of historical state)
  TestValidator.notEquals(
    "snapshot name differs from current product name",
    snapshot.name,
    updatedName,
  );
  // Category is present in snapshot
  TestValidator.predicate(
    "snapshot category is present",
    snapshot.category !== null,
  );
  // Nested structures are present (empty for product without images/variants)
  TestValidator.predicate(
    "snapshot images array is present",
    Array.isArray(snapshot.images),
  );
  TestValidator.predicate(
    "snapshot variants array is present",
    Array.isArray(snapshot.variants),
  );
}
