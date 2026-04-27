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
 * Test that an unauthenticated request is rejected with 401 Unauthorized.
 *
 * Validates that the member authorization guard properly blocks anonymous requests
 * to the available permissions endpoint. A guest connection without any
 * Authorization header is used to call the endpoint, and the system must reject
 * the request with a 401 status code, confirming that member-level authentication
 * is enforced to protect the permission catalog from anonymous access.
 */
export async function test_api_available_permissions_reject_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest connection without any authentication credentials
  const guestConnection: api.IConnection = { host: connection.host };
  // Expect the endpoint to reject the unauthenticated request with 401
  await TestValidator.httpError(
    "unauthenticated request rejected",
    401,
    async () => {
      await api.functional.hrmTimeTracking.member.available_permissions.at(
        guestConnection,
      );
    },
  );
}
