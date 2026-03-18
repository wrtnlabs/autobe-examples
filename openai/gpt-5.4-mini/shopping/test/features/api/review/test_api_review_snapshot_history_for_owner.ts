import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_snapshot_history_for_owner(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = `Pw${RandomGenerator.alphaNumeric(10)}!`;
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        shopping_mall_order_item_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
        rating: 5,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  const snapshots = await api.functional.shoppingMall.reviews.snapshots.index(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReviewSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  TestValidator.predicate(
    "snapshot history should contain at least one record",
    snapshots.data.length > 0,
  );
  TestValidator.equals(
    "all snapshots should belong to the requested review",
    snapshots.data.map((snapshot) => snapshot.reviewId),
    snapshots.data.map(() => review.id),
  );
  TestValidator.equals(
    "snapshot timeline should be sorted by newest first",
    snapshots.data.map((snapshot) => snapshot.createdAt),
    [...snapshots.data]
      .map((snapshot) => snapshot.createdAt)
      .sort((a, b) => b.localeCompare(a)),
  );
  TestValidator.predicate(
    "snapshot entries should expose review rating, content, deletion flag, and timestamps",
    snapshots.data.every(
      (snapshot) =>
        typeof snapshot.rating === "number" &&
        typeof snapshot.isDeleted === "boolean" &&
        typeof snapshot.createdAt === "string" &&
        (snapshot.content === null || typeof snapshot.content === "string") &&
        (snapshot.deletedAt === null || typeof snapshot.deletedAt === "string"),
    ),
  );
  TestValidator.predicate(
    "snapshot history should remain accessible for the owner",
    snapshots.pagination.records >= snapshots.data.length,
  );
}
