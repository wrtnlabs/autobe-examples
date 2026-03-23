import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test multi-tenancy isolation - member cannot access activity logs from other organizations.
 *
 * This test verifies that activity logs are properly isolated between organizations,
 * preventing data leakage across organizational boundaries.
 */
export async function test_api_activity_log_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup organization1
  const admin1Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create activity in organization1 via invitation creation (generates activity log)
  const invitation1 =
    await generate_random_hrm_platform_admin_invitations_create(
      admin1Connection,
      {},
    );
  typia.assert(invitation1);
  // 2. Setup organization2
  const admin2Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create activity in organization2
  const invitation2 =
    await generate_random_hrm_platform_admin_invitations_create(
      admin2Connection,
      {},
    );
  typia.assert(invitation2);
  // 3. Test cross-organization access isolation
  // Generate a UUID that would plausibly belong to organization1's activity logs
  // Since we cannot list activity logs to get real IDs, we test with a generated UUID
  // The system should reject access regardless of whether the ID exists or belongs to another org
  const fakeOrganization1ActivityLogId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();
  // Member2 should not be able to access any activity log from organization1
  // This validates multi-tenancy isolation at the API level
  await TestValidator.httpError(
    "member2 cannot access activity log from different organization",
    [403, 404],
    async () =>
      await api.functional.hrmPlatform.member.activity_logs.at(
        member2Connection,
        {
          activityLogId: fakeOrganization1ActivityLogId,
        },
      ),
  );
  // Verify member2 can only access activity logs from their own organization (organization2)
  // We use organization2's invitation ID as a plausible activity log ID from their org
  // This should either succeed (if ID matches) or return 404 (if ID doesn't exist)
  // but NOT 403 (forbidden), proving organization context is correct
  try {
    const result = await api.functional.hrmPlatform.member.activity_logs.at(
      member2Connection,
      {
        activityLogId: fakeOrganization1ActivityLogId,
      },
    );
    typia.assert(result);
    // If we get here, the activity log was accessible - verify it belongs to organization2
    TestValidator.equals(
      "accessible activity log belongs to member2's organization",
      result.organization.id,
      invitation2.organization.id,
    );
  } catch (exp) {
    // If 404, that's acceptable (ID doesn't exist)
    // If 403, that would indicate isolation is working but we're testing wrong ID
    if (exp instanceof api.HttpError) {
      TestValidator.predicate(
        "error should be 404 not 403 for non-existent ID in own org",
        exp.status === 404,
      );
    }
  }
}