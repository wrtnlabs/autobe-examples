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
export async function test_api_user_report_status_resolution_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: memberData },
  );
  // Step 2: Create moderator connection and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ICommunityBbsModerator.IJoin;
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: moderatorData,
    });
  // Step 3: Create a user report as member
  const reportedUserId = typia.random<string & tags.Format<"uuid">>();
  const violationCategoryId = typia.random<string & tags.Format<"uuid">>();
  const report =
    await generate_random_community_bbs_member_users_reports_create(
      memberConnection,
      {
        body: {
          reported_user_id: reportedUserId,
          violation_category_id: violationCategoryId,
          custom_description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(report);
  // Step 4: Validate that the report was created with correct initial status
  TestValidator.equals(
    "report initial status is pending_review",
    report.status,
    "pending_review",
  );
  // Step 5: Update report status from pending_review to resolved as moderator using moderatorConnection
  const updateData = {
    status: "resolved",
    category_id: report.violation_category_id,
    notes: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
  } satisfies ICommunityBbsReport.IUpdate;
  // Call the update endpoint
  const updatedReport =
    await api.functional.communityBbs.moderator.users.reports.update(
      moderatorConnection,
      {
        body: updateData,
      },
    );
  typia.assert(updatedReport);
  // Step 6: Validate that only permitted fields were updated and immutable fields remained unchanged
  // Validate changed fields
  TestValidator.equals(
    "report status updated correctly",
    updatedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "report category_id updated correctly",
    updatedReport.category_id,
    report.violation_category_id,
  );
  TestValidator.equals(
    "report notes updated correctly",
    updatedReport.notes,
    updateData.notes,
  );
  // Validate immutable fields haven't changed
  TestValidator.equals(
    "report reporter_id unchanged",
    updatedReport.reporter_id,
    member.id,
  );
  TestValidator.equals(
    "report reported_entity_id unchanged",
    updatedReport.reported_entity_id,
    reportedUserId,
  );
  TestValidator.equals(
    "report reported_entity_type unchanged",
    updatedReport.reported_entity_type,
    "user",
  );
  TestValidator.equals(
    "report created_at unchanged",
    updatedReport.created_at,
    report.created_at,
  );
  // Validate updated_at is set and is after created_at
  TestValidator.predicate(
    "report updated_at is set and is after created_at",
    () => {
      return new Date(updatedReport.updated_at!) > new Date(report.created_at);
    },
  );
  // Step 7: Verify the updated_at field is not null
  TestValidator.predicate(
    "updated_at is not null",
    () => updatedReport.updated_at !== null,
  );
}
