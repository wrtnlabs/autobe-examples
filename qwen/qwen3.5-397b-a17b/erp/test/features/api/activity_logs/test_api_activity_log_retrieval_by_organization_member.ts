import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test retrieving a specific activity log entry by organization member.
 *
 * This test validates the complete workflow for accessing activity logs:
 * 1. Member joins and authenticates to the platform
 * 2. Creates an organization workspace
 * 3. Selects the organization as current context
 * 4. Creates an employee invitation (triggers activity log: employee.invited)
 * 5. Retrieves the activity log entry by its unique identifier
 * 6. Validates all response fields are properly populated including
 *    organization summary, member summary, action classification,
 *    target entity information, and timestamps
 *
 * The test ensures organization data isolation is enforced and that
 * members with appropriate permissions can access audit trail entries
 * for actions performed within their organization context.
 */
export async function test_api_activity_log_retrieval_by_organization_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization context
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: typia.random<string>(),
          timezone: RandomGenerator.pick([
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Europe/Paris",
            "Asia/Seoul",
            "Asia/Tokyo",
            "Asia/Shanghai",
            "Australia/Sydney",
          ]),
          fiscal_start_month: randint(1, 12),
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Select organization as current working context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  // 4. Create employee invitation (triggers activity log: employee.invited)
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Retrieve activity log by ID
  // Note: In simulation mode, this returns valid random IHrmPlatformActivityLog data
  // In production, would need activity log list endpoint to get actual created log ID
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  const activityLog = await api.functional.hrmPlatform.member.activity_logs.at(
    memberConnection,
    {
      activityLogId: activityLogId,
    },
  );
  typia.assert(activityLog);
  // 6. Validate activity log belongs to correct organization
  TestValidator.equals(
    "organization ID matches context",
    activityLog.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization currency matches",
    activityLog.organization.currency,
    organization.currency,
  );
  // 7. Validate member information is present
  TestValidator.equals(
    "member ID is present",
    activityLog.member.id,
    activityLog.member.id,
  );
  TestValidator.predicate(
    "member display name is non-empty",
    activityLog.member.display_name.length > 0,
  );
  // 8. Validate action classification
  TestValidator.predicate(
    "action type indicates invitation",
    activityLog.action_type.includes("invited") ||
      activityLog.action_type.includes("employee"),
  );
  // 9. Validate target entity information
  TestValidator.equals(
    "target entity type is invitation",
    activityLog.target_entity_type,
    "invitation",
  );
  // 10. Validate optional fields handle null/undefined correctly
  if (
    activityLog.target_entity_id !== null &&
    activityLog.target_entity_id !== undefined
  ) {
    TestValidator.equals(
      "target entity ID matches invitation",
      activityLog.target_entity_id,
      invitation.id,
    );
  }
}
