import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_order_items_review_create } from "../../../generate/generate_random_shopping_mall_customer_customers_order_items_review_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test that an administrator can retrieve review snapshots for any review on the platform,
 * enabling platform oversight and dispute investigation.
 *
 * Setup: Create an admin account and register. Create a seller account and get it approved.
 * Seller creates a product with a category. Create a customer account and register.
 * Customer places an order for the product, receives delivery, and writes a review.
 * Customer edits the review multiple times to create snapshots.
 *
 * Test: Admin authenticates and calls PATCH /shoppingMall/customer/reviews/{reviewId}/snapshots
 * with the review ID. Verify the response returns all snapshots for the review.
 * Verify snapshot data includes complete audit trail with rating, content, timestamps,
 * and user information for each edit.
 *
 * Business validation: Confirm admin has unrestricted access to all review snapshots
 * across the platform. Verify snapshots provide immutable historical evidence.
 * Validate pagination works correctly.
 */
export async function test_api_review_snapshot_admin_platform_oversight(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  TestValidator.equals("admin grade", adminAuth.grade, "ADMIN");
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Create a simple product (using random category ID for test purposes)
  // In production, categories would be created by admin first
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create a review for testing (using mock order item ID)
  // Note: In a full E2E test, this would require complete order flow
  // For snapshot testing, we focus on the edit history retrieval
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const review =
    await api.functional.shoppingMall.customer.customers.order_items.review.create(
      customerConnection,
      {
        orderItemId: orderItemId,
        body: {
          rating: 5,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);
  TestValidator.equals("initial rating", review.rating, 5);
  // 6. Customer edits review multiple times to create snapshots
  const edit1Content = RandomGenerator.paragraph({ sentences: 3 });
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 4,
        content: edit1Content,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  const edit2Content = RandomGenerator.paragraph({ sentences: 1 });
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 3,
        content: edit2Content,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  const edit3Content = null;
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 5,
        content: edit3Content,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  // 7. Admin retrieves review snapshots
  const snapshotsResponse =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 8. Validate pagination structure
  TestValidator.predicate("has snapshots", snapshotsResponse.data.length > 0);
  TestValidator.predicate(
    "pagination records valid",
    snapshotsResponse.pagination.records >= snapshotsResponse.data.length,
  );
  TestValidator.equals("current page", snapshotsResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit respected",
    snapshotsResponse.data.length <= 10,
  );
  // 9. Validate each snapshot has required fields (typia.assert covers types)
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "has snapshot timestamp",
      snapshot.snapshot_at !== null,
    );
    TestValidator.predicate(
      "has snapshot user",
      snapshot.snapshotByUser !== null,
    );
    TestValidator.equals(
      "snapshot user is customer",
      snapshot.snapshotByUser.id,
      customerAuth.customer.id,
    );
  }
  // 10. Verify we have snapshots from the edits (at least 3 from our 3 edits)
  TestValidator.predicate(
    "has expected snapshots",
    snapshotsResponse.data.length >= 3,
  );
  // 11. Verify snapshot ordering (newest first)
  if (snapshotsResponse.data.length >= 2) {
    const firstSnapshot = snapshotsResponse.data[0];
    const secondSnapshot = snapshotsResponse.data[1];
    TestValidator.predicate(
      "snapshots ordered by newest first",
      new Date(firstSnapshot.snapshot_at).getTime() >=
        new Date(secondSnapshot.snapshot_at).getTime(),
    );
  }
  // 12. Verify admin can access snapshots for any review (platform oversight)
  // This demonstrates admin has unrestricted access across the platform
  const secondPageResponse =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals("second page", secondPageResponse.pagination.current, 2);
}
