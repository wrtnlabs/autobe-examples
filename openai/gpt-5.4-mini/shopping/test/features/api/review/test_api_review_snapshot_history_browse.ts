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

export async function test_api_review_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 20,
    sort: "createdAt",
    order: "desc",
  } satisfies IMallPlatformReviewSnapshot.IRequest;
  const firstPage =
    await api.functional.mallPlatform.administrator.reviewSnapshots.index(
      adminConnection,
      { body: request },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page should match request",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size should not exceed the requested limit",
    firstPage.data.length <= request.limit,
  );
  for (const snapshot of firstPage.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot should preserve a review reference",
      snapshot.review.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve a customer reference",
      snapshot.customer.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot timestamp should exist",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot action should exist",
      snapshot.snapshotAction.length > 0,
    );
  }
  for (let i = 1; i < firstPage.data.length; i += 1) {
    const prev = firstPage.data[i - 1];
    const next = firstPage.data[i];
    TestValidator.predicate(
      "snapshots should be ordered newest first by createdAt",
      prev.createdAt >= next.createdAt,
    );
  }
  if (firstPage.data.length > 0) {
    const targetReviewId = firstPage.data[0].review.id;
    const targetCustomerId = firstPage.data[0].customer.id;
    const targetCreatedAt = firstPage.data[0].createdAt;
    const byReview =
      await api.functional.mallPlatform.administrator.reviewSnapshots.index(
        adminConnection,
        {
          body: {
            reviewId: targetReviewId,
            page: 1,
            limit: 100,
            sort: "createdAt",
            order: "desc",
          } satisfies IMallPlatformReviewSnapshot.IRequest,
        },
      );
    typia.assert(byReview);
    TestValidator.predicate(
      "reviewId filter should return only matching review snapshots",
      byReview.data.every((snapshot) => snapshot.review.id === targetReviewId),
    );
    TestValidator.predicate(
      "reviewId filter should preserve pagination consistency",
      byReview.pagination.current === 1 && byReview.pagination.limit === 100,
    );
    const byCustomer =
      await api.functional.mallPlatform.administrator.reviewSnapshots.index(
        adminConnection,
        {
          body: {
            customerId: targetCustomerId,
            page: 1,
            limit: 100,
            sort: "createdAt",
            order: "desc",
          } satisfies IMallPlatformReviewSnapshot.IRequest,
        },
      );
    typia.assert(byCustomer);
    TestValidator.predicate(
      "customerId filter should return only matching customer snapshots",
      byCustomer.data.every(
        (snapshot) => snapshot.customer.id === targetCustomerId,
      ),
    );
    const byCreatedAt =
      await api.functional.mallPlatform.administrator.reviewSnapshots.index(
        adminConnection,
        {
          body: {
            createdAtTo: targetCreatedAt,
            page: 1,
            limit: 100,
            sort: "createdAt",
            order: "desc",
          } satisfies IMallPlatformReviewSnapshot.IRequest,
        },
      );
    typia.assert(byCreatedAt);
    TestValidator.predicate(
      "createdAt range filter should not include later snapshots",
      byCreatedAt.data.every(
        (snapshot) => snapshot.createdAt <= targetCreatedAt,
      ),
    );
    if (byReview.data.length > 1) {
      for (let i = 1; i < byReview.data.length; i += 1) {
        TestValidator.predicate(
          "review-scoped snapshots should remain ordered newest first",
          byReview.data[i - 1].createdAt >= byReview.data[i].createdAt,
        );
      }
    }
  } else {
    TestValidator.equals(
      "empty snapshot list should report zero records",
      firstPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty snapshot list should report zero pages",
      firstPage.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty snapshot list should have no data",
      firstPage.data.length,
      0,
    );
  }
}
