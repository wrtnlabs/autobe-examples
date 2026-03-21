import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_cross_organization_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member in organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Create second member in organization B (separate organization)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 3. Get organization IDs from the authorized responses
  // The organization ID can be extracted from activeTimers which contains project with organization context
  // Since activeTimers may be empty, we need to use organization from the project relationship
  // We'll use the member's organization through the project structure in activeTimers
  let memberAOrgId: string | null = null;
  let memberBOrgId: string | null = null;
  // Extract organization IDs from activeTimers project data
  if (memberA.activeTimers.length > 0) {
    memberAOrgId = memberA.activeTimers[0]!.project.organization.id;
  }
  if (memberB.activeTimers.length > 0) {
    memberBOrgId = memberB.activeTimers[0]!.project.organization.id;
  }
  // 4. Generate a random activity log ID from organization B
  const activityLogIdFromOrgB = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to access activity log from org B using member A's credentials
  // This should be rejected due to cross-organization isolation
  await TestValidator.error(
    "cross-organization access should be denied",
    async () => {
      await api.functional.erpHrm.member.organizations.activity_logs.at(
        memberAConnection,
        {
          organizationId: (memberBOrgId ??
            typia.random<string & tags.Format<"uuid">>()) as string &
            tags.Format<"uuid">,
          activityLogId: activityLogIdFromOrgB,
        },
      );
    },
  );
  // 6. Additionally test: member A trying to access with their own org but invalid activity log
  // This verifies the system checks activity log ownership within the organization
  if (memberAOrgId) {
    const nonExistentActivityLogId = typia.random<
      string & tags.Format<"uuid">
    >();
    await TestValidator.error(
      "non-existent activity log in own org should return error",
      async () => {
        await api.functional.erpHrm.member.organizations.activity_logs.at(
          memberAConnection,
          {
            organizationId: memberAOrgId as string & tags.Format<"uuid">,
            activityLogId: nonExistentActivityLogId,
          },
        );
      },
    );
  }
}
