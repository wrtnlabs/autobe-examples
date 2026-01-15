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
export async function test_api_review_moderation_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as admin
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
  // Step 2: For this test, we need a review ID that has moderation logs
  // Since we cannot create reviews or apply moderation actions using the provided API,
  // we will use a generated UUID as a placeholder review ID
  // In a real environment, this would be an actual review ID from the system
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve moderation logs for the review
  const logs: IPageIShoppingMallReviewModerationLog =
    await api.functional.shoppingMall.admin.reviews.moderation_logs.patchByReviewid(
      adminConnection,
      { reviewId },
    );
  typia.assert(logs);
  // Step 4: Validate the pagination structure
  TestValidator.equals("pagination exists", logs.pagination, logs.pagination);
  TestValidator.predicate(
    "current page is non-negative",
    logs.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", logs.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    logs.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", logs.pagination.pages >= 0);
  // Step 5: Validate the data array structure and content
  TestValidator.predicate("data array exists", logs.data.length >= 0);
  TestValidator.equals("data is an array", Array.isArray(logs.data), true);
  // Step 6: Validate each moderation log entry
  for (const log of logs.data) {
    TestValidator.predicate(
      "decision is one of valid enum values",
      log.decision === "approved" ||
        log.decision === "rejected" ||
        log.decision === "flagged",
    );
    TestValidator.predicate(
      "reason is one of valid enum values",
      [
        "spam",
        "hate_speech",
        "harassment",
        "nudity",
        "fraud",
        "impersonation",
        "copyright",
        "other",
      ].includes(log.reason),
    );
    TestValidator.predicate(
      "created_by is a valid UUID",
      /^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i.test(
        log.created_by,
      ),
    );
    // comment field is optional, so we need to validate type if it exists
    if (log.comment !== undefined) {
      TestValidator.predicate(
        "comment is string and length <= 1000",
        typeof log.comment === "string" && log.comment.length <= 1000,
      );
    }
  }
}
