import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully retrieve a system permission code.
 *
 * Validates the complete flow from member registration to permission code retrieval. An authenticated member session is established first via the `authorize_member_join` utility, then the available-permissions endpoint is called with the Bearer token.
 *
 * The response is validated against the `IHrmTimeTrackingRolePermission` type using `typia.assert`, and the returned permission code is verified to be one of the 9 valid system codes defined by the platform.
 *
 * 1. Register a new member via the `authorize_member_join` utility, which internally calls `POST /hrmTimeTracking/auth/member/join` and sets the JWT token on the connection.
 * 2. Call `GET /hrmTimeTracking/member/available-permissions` with the authenticated connection.
 * 3. Validate the response with `typia.assert` against `IHrmTimeTrackingRolePermission`.
 * 4. Verify the returned `permission_code` is one of the 9 valid system permission codes.
 */
export async function test_api_available_permissions_retrieve_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection and register a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve available permissions
  const output: IHrmTimeTrackingRolePermission =
    await api.functional.hrmTimeTracking.member.available_permissions.at(
      memberConnection,
    );
  typia.assert(output);
  // 3. Verify the permission code is one of the 9 valid system codes
  const VALID_CODES = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  TestValidator.predicate(
    "permission code is one of the 9 valid system codes",
    VALID_CODES.includes(
      output.permission_code as (typeof VALID_CODES)[number],
    ),
  );
}
