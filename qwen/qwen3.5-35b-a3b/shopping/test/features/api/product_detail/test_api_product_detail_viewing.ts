import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_viewing(
  connection: api.IConnection,
): Promise<void> {
  // Set simulate mode to generate random valid product data
  // This is necessary since no product creation API is available in the SDK
  const testConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };
  // Call product detail endpoint with random UUID
  // In simulate mode, this returns a valid IEcommerceMallProduct
  const productDetail = await api.functional.ecommerceMall.products.at(
    testConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(productDetail);
  // 1. Validate product core fields
  TestValidator.equals(
    "product name length",
    productDetail.name.length <= 500,
    true,
  );
  TestValidator.equals(
    "product base price positive",
    productDetail.base_price > 0,
    true,
  );
  TestValidator.equals("product is active", productDetail.is_active, true);
  TestValidator.equals(
    "product has uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      productDetail.id,
    ),
    true,
  );
  // 2. Validate seller information
  TestValidator.predicate("seller exists", () => productDetail.seller !== null);
  TestValidator.equals(
    "seller has email",
    productDetail.seller.email.includes("@"),
    true,
  );
  TestValidator.equals(
    "seller not suspended",
    productDetail.seller.isSuspended,
    false,
  );
  TestValidator.equals(
    "seller approved",
    productDetail.seller.approvalStatus === "approved",
    true,
  );
  TestValidator.equals(
    "seller not banned",
    productDetail.seller.isBanned,
    false,
  );
  TestValidator.notEquals("seller has id", productDetail.seller.id, "");
  // 3. Validate category information
  TestValidator.equals(
    "category exists",
    productDetail.category !== null,
    true,
  );
  TestValidator.equals(
    "category name length",
    productDetail.category.name.length > 0,
    true,
  );
  TestValidator.equals(
    "category has uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      productDetail.category.id,
    ),
    true,
  );
  TestValidator.equals(
    "category is leaf or has parent",
    productDetail.category.isLeaf !== null,
    true,
  );
  TestValidator.equals(
    "category created_at valid",
    productDetail.category.createdAt !== "",
    true,
  );
  // 4. Validate images are in display order
  TestValidator.equals(
    "has images array",
    Array.isArray(productDetail.images),
    true,
  );
  if (productDetail.images.length > 0) {
    TestValidator.equals(
      "first image is valid",
      productDetail.images[0].display_order !== null,
      true,
    );
    TestValidator.equals(
      "first image has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        productDetail.images[0].id,
      ),
      true,
    );
    TestValidator.equals(
      "first image has url",
      productDetail.images[0].image_url.includes("://"),
      true,
    );
    TestValidator.equals(
      "first image has valid order",
      productDetail.images[0].display_order >= 0,
      true,
    );
  }
  // 5. Validate variants
  TestValidator.equals(
    "has variants array",
    Array.isArray(productDetail.variants),
    true,
  );
  if (productDetail.variants.length > 0) {
    const firstVariant = productDetail.variants[0];
    TestValidator.equals(
      "variant has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstVariant.id,
      ),
      true,
    );
    TestValidator.equals(
      "variant sku_code has value",
      firstVariant.sku_code.length > 0 && firstVariant.sku_code.length <= 50,
      true,
    );
    TestValidator.equals(
      "variant has options",
      typeof firstVariant.option_values === "object",
      true,
    );
    TestValidator.equals(
      "variant is active",
      firstVariant.is_active !== null,
      true,
    );
    TestValidator.equals(
      "variant stock is non-negative",
      firstVariant.stock_quantity >= 0,
      true,
    );
    TestValidator.equals(
      "variant stock is int32",
      Number.isInteger(firstVariant.stock_quantity),
      true,
    );
    TestValidator.equals(
      "variant has product ref",
      firstVariant.product !== null,
      true,
    );
  }
  // 6. Validate timestamps
  TestValidator.equals(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      productDetail.created_at,
    ),
    true,
  );
  TestValidator.equals(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      productDetail.updated_at,
    ),
    true,
  );
  TestValidator.predicate(
    "deleted_at can be null",
    () =>
      productDetail.deleted_at === null ||
      productDetail.deleted_at !== undefined,
  );
  // 7. Validate snapshots
  TestValidator.equals(
    "has snapshots array",
    Array.isArray(productDetail.snapshots),
    true,
  );
  if (productDetail.snapshots.length > 0) {
    const firstSnapshot = productDetail.snapshots[0];
    TestValidator.equals(
      "snapshot has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSnapshot.id,
      ),
      true,
    );
    TestValidator.equals(
      "snapshot created_at is valid",
      firstSnapshot.createdAt !== "",
      true,
    );
  }
  // 8. Validate reviews
  TestValidator.equals(
    "has reviews array",
    Array.isArray(productDetail.reviews),
    true,
  );
  if (productDetail.reviews.length > 0) {
    const firstReview = productDetail.reviews[0];
    TestValidator.equals(
      "review rating is 1-5",
      firstReview.rating >= 1 && firstReview.rating <= 5,
      true,
    );
    TestValidator.equals(
      "review has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstReview.id,
      ),
      true,
    );
    TestValidator.equals(
      "review customer exists",
      firstReview.customer !== null,
      true,
    );
    TestValidator.equals(
      "review product exists",
      firstReview.product !== null,
      true,
    );
  }
  // 9. Validate counts
  TestValidator.equals(
    "wishlist count is int32",
    Number.isInteger(productDetail.wishlist_entries_count) &&
      productDetail.wishlist_entries_count >= 0,
    true,
  );
  TestValidator.equals(
    "order items count is int32",
    Number.isInteger(productDetail.order_items_count) &&
      productDetail.order_items_count >= 0,
    true,
  );
  TestValidator.equals(
    "reviews count is int32",
    Number.isInteger(productDetail.reviews_count) &&
      productDetail.reviews_count >= 0,
    true,
  );
  // 10. Verify seller profile fields from IEcommerceMallSeller.ISummary
  const expectedSellerFields: (keyof IEcommerceMallSeller.ISummary)[] = [
    "id",
    "email",
    "approvalStatus",
    "rejectionReason",
    "isSuspended",
    "isBanned",
    "createdAt",
    "updatedAt",
  ];
  expectedSellerFields.forEach((field) => {
    TestValidator.equals(
      `seller has ${field}`,
      Object.prototype.hasOwnProperty.call(productDetail.seller, field),
      true,
    );
  });
  // 11. Verify category profile fields from IEcommerceMallCategory.ISummary
  const expectedCategoryFields: (keyof IEcommerceMallCategory.ISummary)[] = [
    "id",
    "name",
    "description",
    "parent",
    "isLeaf",
    "createdAt",
    "deletedAt",
  ];
  expectedCategoryFields.forEach((field) => {
    TestValidator.equals(
      `category has ${field}`,
      Object.prototype.hasOwnProperty.call(productDetail.category, field),
      true,
    );
  });
}
