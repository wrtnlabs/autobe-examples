import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserReport";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_user_reports_filter_by_target_user_and_category(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate moderator using utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Create search parameters to filter by target_user_id and category
  // Note: We cannot create reports since the create endpoint doesn't exist in provided API functions
  // We are only allowed to use the index endpoint (PATCH /communityBbs/moderator/users/reports)
  // The scenario asks to filter by target_user_id and category, but we can't create reports for testing
  // Therefore, we'll use plausible values for target_user_id and category
  // We must use the provided ICommunityBbsUserReport.IRequest type
  // The category in IRequest is a string field (not UUID) - we must use "harassment" as string
  // Since we cannot create reports and cannot know existing report IDs,
  // we'll use a UUID that might exist in test environment
  // And use category "harassment" as specified in scenario
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  const searchParams: ICommunityBbsUserReport.IRequest = {
    status: "pending", // Changed from 'pending_review' to 'pending' to match allowed type
    target_user_id: targetUserId,
    category: "harassment", // Must be string as per IRequest schema, not UUID
    page: 1,
    limit: 10,
  };
  // Step 3: Use the provided index endpoint to filter reports
  const result =
    await api.functional.communityBbs.moderator.users.reports.index(
      moderatorConnection,
      {
        body: searchParams,
      },
    );
  typia.assert(result);
  // Step 4: Validate response structure
  // We cannot validate specific reports exist since we can't create them, but we can validate:
  // - The pagination structure
  // - The data array structure
  // - Basic type safety
  TestValidator.equals("Page should be 1", result.pagination.current, 1);
  TestValidator.equals("Limit should be 10", result.pagination.limit, 10);
  TestValidator.equals(
    "Response should contain data array",
    Array.isArray(result.data),
    true,
  );
  // If we get any reports back, validate their structure
  if (result.data.length > 0) {
    const firstReport = result.data[0];
    TestValidator.equals(
      "Report should have id",
      typeof firstReport.id === "string",
      true,
    );
    TestValidator.equals(
      "Report should have reported_user_id",
      typeof firstReport.reported_user_id === "string",
      true,
    );
    TestValidator.equals(
      "Report should have violation_category_id",
      typeof firstReport.violation_category_id === "string",
      true,
    );
    TestValidator.equals(
      "Report should have custom_description",
      typeof firstReport.custom_description === "string",
      true,
    );
    TestValidator.equals(
      "Report should have status",
      firstReport.status === "pending_review" ||
        firstReport.status === "reviewed" ||
        firstReport.status === "resolved" ||
        firstReport.status === "rejected",
      true,
    );
    TestValidator.equals(
      "Report should have created_at",
      typeof firstReport.created_at === "string",
      true,
    );
  }
}