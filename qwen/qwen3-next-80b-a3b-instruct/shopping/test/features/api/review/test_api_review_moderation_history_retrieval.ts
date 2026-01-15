import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModerationLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_review_moderation_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using the provided utility
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a random UUID as the reviewId (since we can't create a review)
  const reviewId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the moderation history for this review
  const moderationLog: IPageIShoppingMallReviewModerationLog =
    await api.functional.shoppingMall.admin.reviews.moderation_logs.getByReviewid(
      adminConnection,
      {
        reviewId: reviewId,
      },
    );
  typia.assert(moderationLog);
  // Step 4: Validate the response structure according to IPageIShoppingMallReviewModerationLog
  // Validate pagination
  TestValidator.equals(
    "pagination current should be at least 0",
    moderationLog.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should be at least 1",
    moderationLog.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination records should be at least 0",
    moderationLog.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages should be at least 0",
    moderationLog.pagination.pages >= 0,
    true,
  );
  // Validate data array exists
  TestValidator.predicate("data should be an array", () =>
    Array.isArray(moderationLog.data),
  );
  // Validate each data entry if any exist
  for (const logEntry of moderationLog.data) {
    typia.assert(logEntry);
    TestValidator.equals(
      "decision should be one of approved, rejected, flagged",
      ["approved", "rejected", "flagged"].includes(logEntry.decision),
      true,
    );
    TestValidator.equals(
      "reason should be in the predefined list",
      [
        "spam",
        "hate_speech",
        "harassment",
        "nudity",
        "fraud",
        "impersonation",
        "copyright",
        "other",
      ].includes(logEntry.reason),
      true,
    );
    if (logEntry.comment !== undefined) {
      const comment: string = logEntry.comment satisfies string as string;
      TestValidator.predicate(
        "comment length should be <= 1000",
        () => comment.length <= 1000,
      );
    }
    typia.assert(logEntry.created_by);
  }
  // Step 5: Verify that unauthenticated users cannot access
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user should not access moderation logs",
    async () => {
      await api.functional.shoppingMall.admin.reviews.moderation_logs.getByReviewid(
        guestConnection,
        {
          reviewId: reviewId,
        },
      );
    },
  );
}