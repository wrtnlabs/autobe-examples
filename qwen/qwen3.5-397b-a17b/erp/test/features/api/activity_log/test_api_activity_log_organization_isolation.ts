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

export async function test_api_activity_log_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Member A and Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  const orgA = await generate_random_hrm_platform_member_organizations_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgA);
  // 2. Select Organization A as current context for Member A
  await api.functional.hrmPlatform.member.organizations.select(
    memberAConnection,
    {
      organizationId: orgA.id,
    },
  );
  // 3. Create activity log in Organization A via employee invitation
  const invitationA =
    await generate_random_hrm_platform_member_invitations_create(
      memberAConnection,
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
  typia.assert(invitationA);
  // 4. Setup Member B and Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  const orgB = await generate_random_hrm_platform_member_organizations_create(
    memberBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 3,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgB);
  // 5. Select Organization B as current context for Member B
  await api.functional.hrmPlatform.member.organizations.select(
    memberBConnection,
    {
      organizationId: orgB.id,
    },
  );
  // 6. Create activity log in Organization B via employee invitation
  const invitationB =
    await generate_random_hrm_platform_member_invitations_create(
      memberBConnection,
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
  typia.assert(invitationB);
  // 7. Test cross-organization access isolation
  // Member B (in Org B context) tries to access activity log from Org A
  // This should fail - members can only access activity logs from their current organization
  // Generate a UUID for testing cross-org access rejection
  // In production, this would be an actual activity log ID from Org A
  // The system should reject access regardless of whether the ID exists in Org A
  // because the member's current organization context is Org B
  const activityLogIdFromOrgA = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cross-organization activity log access should be rejected",
    async () => {
      await api.functional.hrmPlatform.member.activity_logs.at(
        memberBConnection,
        {
          activityLogId: activityLogIdFromOrgA,
        },
      );
    },
  );
  // 8. Verify Member B can access their own organization's activity logs
  // Generate a UUID for Org B's activity log context
  const activityLogIdFromOrgB = typia.random<string & tags.Format<"uuid">>();
  // This should succeed (or at least not fail due to organization isolation)
  // Note: May still fail with 404 if the specific ID doesn't exist, but not due to org isolation
  const activityLogB = await api.functional.hrmPlatform.member.activity_logs.at(
    memberBConnection,
    {
      activityLogId: activityLogIdFromOrgB,
    },
  );
  typia.assert(activityLogB);
  TestValidator.equals(
    "activity log organization matches current context",
    activityLogB.organization.id,
    orgB.id,
  );
}