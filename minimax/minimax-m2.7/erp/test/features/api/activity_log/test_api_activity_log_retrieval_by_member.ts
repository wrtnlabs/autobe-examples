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

export async function test_api_activity_log_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via POST /erpHrm/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. The authorized response contains the member's organization in the session context
  // Since member join creates an organization automatically, we get the organization context
  // For this test, we generate a random activity log ID to test the retrieval endpoint
  // 3. Retrieve the specific activity log by ID
  // Note: In a real scenario, the activityLogId would come from a prior action
  // (e.g., project creation, employee invitation) that generated an activity log
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  const activityLog =
    await api.functional.erpHrm.member.organizations.activity_logs.at(
      memberConnection,
      {
        organizationId: authorized.id,
        activityLogId: activityLogId,
      },
    );
  // 4. Validate response structure based on IErpHrmActivityLog DTO
  // The DTO contains action_type (string) and count (number)
  TestValidator.predicate(
    "has valid action_type",
    typeof activityLog.action_type === "string" &&
      activityLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "count is non-negative integer",
    Number.isInteger(activityLog.count) && activityLog.count >= 0,
  );
}
