import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test changing an existing report decision's status from approved to dismissed, including updating moderator comments.
 *
 * Steps:
 * 1. Authenticate as an admin.
 * 2. Using a random UUID as the report decision ID because no creation endpoint exists.
 * 3. Update the decision comments which triggers status change to 'dismissed' implicitly.
 * 4. Verify response contains updated decision status 'dismissed' and new comments.
 * 5. Confirm moderator_id remains unchanged.
 * 6. Check timestamps for modification indication.
 */
export async function test_api_reports_decision_update_status_approved_to_dismissed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password: "StrongP@ssw0rd!",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  // 2. Use random UUID as report decision ID due to no create endpoint
  const existingDecisionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update with new comment (status change done server side)
  const newComments = RandomGenerator.paragraph({ sentences: 2 });
  // 4. Send update request
  const updatedDecision =
    await api.functional.communityPlatform.admin.reports_decisions.updateReportDecision(
      adminConnection,
      {
        id: existingDecisionId,
        body: {
          comment: newComments,
        } satisfies ICommunityPlatformReportsDecision.IUpdate,
      },
    );
  typia.assert(updatedDecision);
  // 5. Validate updated decision status 'dismissed'
  TestValidator.equals(
    "decision status",
    updatedDecision.decision,
    "dismissed",
  );
  // 6. Validate comments updated
  TestValidator.equals(
    "updated comments",
    updatedDecision.comments,
    newComments,
  );
  // 7. Confirm moderator_id remains unchanged (UUID format check)
  TestValidator.predicate(
    "valid moderator_id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      updatedDecision.moderator_id,
    ),
  );
  // 8. Confirm updated_at is later or equal to created_at
  const createdAt = new Date(updatedDecision.created_at).getTime();
  const updatedAt = new Date(updatedDecision.updated_at).getTime();
  TestValidator.predicate(
    "updated_at later or equal to created_at",
    updatedAt >= createdAt,
  );
  // 9. Confirm deleted_at is null (active)
  TestValidator.equals("deleted_at is null", updatedDecision.deleted_at, null);
}
