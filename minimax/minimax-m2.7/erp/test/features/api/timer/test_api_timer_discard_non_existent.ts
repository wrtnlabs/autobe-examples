import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test error response when attempting to discard a non-existent timer.
 *
 * **Prerequisites Setup**:
 * 1. Member registers via POST /erpHrm/auth/member/join
 *
 * **Test Steps**:
 * 1. Call DELETE /erpHrm/member/timers/{timerId} with a valid UUID that does not exist
 * 2. Verify HTTP 404 Not Found response
 * 3. Verify appropriate error message indicating timer not found
 *
 * **Business Rules Validated**:
 * - Timer must exist before it can be discarded
 * - Proper 404 response for non-existent resource
 * - System correctly rejects operations on non-existent entities
 */
export async function test_api_timer_discard_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a valid UUID that does not exist in the system
  const nonExistentTimerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to discard non-existent timer and verify 404 error
  await TestValidator.httpError(
    "timer not found returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.timers.erase(memberConnection, {
        timerId: nonExistentTimerId,
      });
    },
  );
}
