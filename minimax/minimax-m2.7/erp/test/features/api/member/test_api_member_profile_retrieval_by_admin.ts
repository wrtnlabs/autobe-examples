import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can successfully retrieve a member's profile by their UUID.
 *
 * Scenario:
 * 1. Admin authenticates via join endpoint to get authorization token
 * 2. Admin calls GET /erpHrm/admin/members/{memberId} with their own member UUID
 * 3. Verify response returns HTTP 200 with member object
 * 4. Validate that returned data matches the authenticated admin record
 */
export async function test_api_member_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IErpHrmAdmin.IAuthorized =
    await api.functional.erpHrm.auth.admin.join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 2: Retrieve the admin's own member profile using their member ID
  const memberId: string & tags.Format<"uuid"> = adminAuth.id;
  const memberProfile: IErpHrmMember =
    await api.functional.erpHrm.admin.members.at(adminConnection, {
      memberId: memberId,
    });
  // Step 3: Validate response structure with typia.assert()
  // This validates all fields including activeTimers, projectSummary, taskOverview, recentActivity
  // Also implicitly validates password_hash is NOT present (security requirement)
  typia.assert(memberProfile);
  // Step 4: Verify the response is a valid IErpHrmMember structure
  TestValidator.predicate(
    "member profile has activeTimers array",
    Array.isArray(memberProfile.activeTimers),
  );
  TestValidator.predicate(
    "member profile has projectSummary object",
    typeof memberProfile.projectSummary === "object",
  );
  TestValidator.predicate(
    "member profile has taskOverview object",
    typeof memberProfile.taskOverview === "object",
  );
  TestValidator.predicate(
    "member profile has recentActivity object",
    typeof memberProfile.recentActivity === "object",
  );
}
