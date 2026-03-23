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

export async function test_api_activity_log_retrieve_with_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Setup: Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin creates employee invitation (generates activity log as side effect)
  const invitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invitation);
  // 4. Retrieve activity log by ID
  // Note: In a real scenario, we would list activity logs first to get the actual activityLogId
  // For this test, we use the invitation ID as a reference point
  const activityLogId = invitation.id;
  const activityLog = await api.functional.hrmPlatform.member.activity_logs.at(
    memberConnection,
    {
      activityLogId,
    },
  );
  typia.assert(activityLog);
  // 5. Validate activity log structure and content
  TestValidator.equals(
    "activity log id matches",
    activityLog.id,
    activityLogId,
  );
  TestValidator.predicate(
    "has action type",
    activityLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "has target entity type",
    activityLog.target_entity_type.length > 0,
  );
  TestValidator.predicate(
    "has action description",
    activityLog.action_description.length > 0,
  );
  // 6. Validate organization information
  TestValidator.predicate(
    "organization has id",
    activityLog.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization has name",
    activityLog.organization.name.length > 0,
  );
  // 7. Validate acting member information (may be null if no member performed action)
  if (activityLog.actingMember !== null) {
    TestValidator.predicate(
      "acting member has id",
      activityLog.actingMember.id.length > 0,
    );
    TestValidator.predicate(
      "acting member has email",
      activityLog.actingMember.email.length > 0,
    );
  }
  // 8. Validate changes array contains field-level modifications
  TestValidator.predicate(
    "changes is array",
    Array.isArray(activityLog.changes),
  );
  for (const change of activityLog.changes) {
    TestValidator.predicate(
      "change has field name",
      change.field_name.length > 0,
    );
    TestValidator.predicate(
      "change has field type",
      change.field_type.length > 0,
    );
    TestValidator.predicate(
      "change has created timestamp",
      change.created_at.length > 0,
    );
  }
}
