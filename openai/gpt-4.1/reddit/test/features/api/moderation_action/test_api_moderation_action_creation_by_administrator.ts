import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test the creation of a moderation action by an authenticated administrator.
 *
 * This test covers the full flow:
 *
 * 1. Administrator registration and authentication
 * 2. Creating a moderation action referencing a business report
 * 3. Verifying that the moderation action is stored with correct required fields
 * 4. Validating the returned moderation action entity:
 *
 *    - Report linkage
 *    - Action type
 *    - Result memo
 *    - Status
 *    - Audit timestamps
 *    - Non-null uuid id
 *    - Includes summary relationships for report and relevant entity references
 */
export async function test_api_moderation_action_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Simulate a report to be the subject of moderation
  // Since no report creation API is given, synthesize a fake report summary for test input
  const reportSummary: ICommunityPlatformReport.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
  };

  // 3. Create a new moderation action
  const moderationBody = {
    report_id: reportSummary.id,
    action_type: RandomGenerator.pick([
      "remove_post",
      "warn_user",
      "mute_user",
      "escalate",
      "ban_user",
      "restore_content",
    ] as const),
    result: RandomGenerator.paragraph(),
    status: RandomGenerator.pick([
      "in_progress",
      "completed",
      "reversed",
    ] as const),
    // Omit target_post_id, target_comment_id, target_community_id for generic test
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderation: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.administrator.moderationActions.create(
      connection,
      {
        body: moderationBody,
      },
    );
  typia.assert(moderation);

  // 4. Validate key fields and relationships in the moderation action
  TestValidator.predicate(
    "moderation id is uuid",
    typeof moderation.id === "string" && moderation.id.length === 36,
  );
  TestValidator.equals(
    "moderation action has correct report linkage",
    moderation.report.id,
    reportSummary.id,
  );
  TestValidator.equals(
    "moderation action_type matches request",
    moderation.action_type,
    moderationBody.action_type,
  );
  TestValidator.equals(
    "moderation result matches request",
    moderation.result,
    moderationBody.result,
  );
  TestValidator.equals(
    "moderation status matches request",
    moderation.status,
    moderationBody.status,
  );
  TestValidator.predicate(
    "moderation created_at is ISO date-time",
    typeof moderation.created_at === "string" &&
      moderation.created_at.includes("T") &&
      moderation.created_at.includes(":"),
  );
  TestValidator.predicate(
    "moderation updated_at is ISO date-time",
    typeof moderation.updated_at === "string" &&
      moderation.updated_at.includes("T") &&
      moderation.updated_at.includes(":"),
  );
}
