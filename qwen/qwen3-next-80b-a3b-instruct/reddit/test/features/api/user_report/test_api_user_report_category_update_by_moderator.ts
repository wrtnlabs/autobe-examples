import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserReport";
import { prepare_random_community_bbs_user_report } from "../../../prepare/prepare_random_community_bbs_user_report";
import { generate_random_community_bbs_member_users_reports_create } from "../../../generate/generate_random_community_bbs_member_users_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_user_report_category_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account using the join utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a user report as the member
  const report: ICommunityBbsUserReport =
    await generate_random_community_bbs_member_users_reports_create(
      memberConnection,
      {
        body: {
          reported_user_id: typia.random<string & tags.Format<"uuid">>(),
          violation_category_id: typia.random<string & tags.Format<"uuid">>(),
          custom_description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityBbsUserReport.ICreate,
      },
    );
  typia.assert(report);
  // Save the original report data for validation
  const originalReport = { ...report };
  // Step 3: Create a moderator account using the join utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(32); // Capture password for later use
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: password, // Use property_hash as required by schema
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 4: Authenticate as moderator using the login utility function
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorAuthConnection, {
    body: {
      email: moderator.email,
      password_hash: password, // Use the saved password_hash value, not access from moderator object
    } satisfies ICommunityBbsModerator.ILogin,
  });
  // Step 5: Update the report's category as the moderator
  const updatedReport: ICommunityBbsReport =
    await api.functional.communityBbs.moderator.users.reports.update(
      moderatorAuthConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityBbsReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Step 6: Validate that all original fields are preserved and only the category has changed
  TestValidator.equals(
    "report ID preserved",
    updatedReport.id,
    originalReport.id,
  );
  // Map reporter_id from reported_user_id
  TestValidator.equals(
    "reporter ID preserved",
    updatedReport.reporter_id,
    (originalReport.reported_user_id satisfies string as string),
  );
  TestValidator.equals(
    "reported entity ID preserved",
    updatedReport.reported_entity_id,
    (originalReport.reported_user_id satisfies string as string),
  );
  TestValidator.equals(
    "reported entity type preserved",
    updatedReport.reported_entity_type,
    ("user" satisfies "user" as "user"),
  );
  TestValidator.equals(
    "created_at preserved",
    updatedReport.created_at,
    originalReport.created_at,
  );
  // Map status values: pending_review->pending, reviewed->investigating, resolved->resolved, rejected->dismissed
  const mappedStatus: "pending" | "investigating" | "dismissed" | "resolved" =
    originalReport.status === "pending_review" ? "pending" :
    originalReport.status === "reviewed" ? "investigating" :
    originalReport.status === "resolved" ? "resolved" :
    originalReport.status === "rejected" ? "dismissed" :
    "resolved"; // fallback
  
  TestValidator.equals(
    "status preserved",
    updatedReport.status,
    mappedStatus,
  );
  // Validate that category_id has been updated from the original violation_category_id
  TestValidator.notEquals(
    "category_id updated",
    updatedReport.category_id,
    originalReport.violation_category_id,
  );
  // Validate that updated_at is set (not null)
  TestValidator.predicate(
    "updated_at is set",
    () =>
      updatedReport.updated_at !== null &&
      updatedReport.updated_at !== undefined,
  );
}