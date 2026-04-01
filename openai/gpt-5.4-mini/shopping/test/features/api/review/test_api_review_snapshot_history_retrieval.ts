import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_review_create } from "../../../generate/generate_random_mall_platform_customer_order_items_review_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

export async function test_api_review_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const review =
    await api.functional.mallPlatform.customer.orderItems.review.create(
      customerConnection,
      {
        orderItemId,
        body: {
          rating: 5,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformReview.ICreate,
      },
    );
  typia.assert(review);
  const firstPage =
    await api.functional.mallPlatform.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          reviewId: review.id,
          customerId: review.customer.id,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "snapshot history is scoped to the requested review",
    firstPage.data.every((snapshot) => snapshot.review.id === review.id),
    true,
  );
  TestValidator.equals(
    "snapshot history is scoped to the requested customer",
    firstPage.data.every(
      (snapshot) => snapshot.customer.id === review.customer.id,
    ),
    true,
  );
  TestValidator.equals("snapshot page number", firstPage.pagination.current, 1);
  TestValidator.equals("snapshot page size", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "snapshot history record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot history page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  if (firstPage.data.length > 0) {
    const snapshot = firstPage.data[0];
    TestValidator.equals(
      "snapshot review reference",
      snapshot.review.id,
      review.id,
    );
    TestValidator.equals(
      "snapshot customer reference",
      snapshot.customer.id,
      review.customer.id,
    );
    TestValidator.equals(
      "snapshot rating preserved",
      snapshot.rating,
      review.rating,
    );
    TestValidator.equals(
      "snapshot content preserved",
      snapshot.content,
      review.content,
    );
    TestValidator.predicate(
      "snapshot action is recorded",
      snapshot.snapshotAction.length > 0,
    );
    TestValidator.predicate(
      "snapshot createdAt exists",
      snapshot.createdAt.length > 0,
    );
    TestValidator.equals(
      "snapshot deleted flag mirrors active review state",
      snapshot.isDeleted,
      review.deletedAt !== null,
    );
  }
  if (firstPage.pagination.pages > 1) {
    const lastPage =
      await api.functional.mallPlatform.administrator.reviews.snapshots.index(
        adminConnection,
        {
          reviewId: review.id,
          body: {
            reviewId: review.id,
            customerId: review.customer.id,
            page: firstPage.pagination.pages,
            limit: 10,
            sort: "created_at",
            order: "desc",
          } satisfies IMallPlatformReviewSnapshot.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page remains scoped to the same review",
      lastPage.data.every((snapshot) => snapshot.review.id === review.id),
      true,
    );
    TestValidator.equals(
      "last page remains scoped to the same customer",
      lastPage.data.every(
        (snapshot) => snapshot.customer.id === review.customer.id,
      ),
      true,
    );
  }
}
