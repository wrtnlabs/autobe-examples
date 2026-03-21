import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function test_api_permissions_includes_standard_permission_codes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call GET /erpHrm/member/permissions
  const permissions =
    await api.functional.erpHrm.member.permissions.list(memberConnection);
  typia.assert(permissions);
  // 3. Verify the response contains expected permission codes
  // The response is IErpHrmRolePermission.ISummary which contains:
  // - id (UUID)
  // - permission (string)
  // - role (IErpHrmRole.ISummary)
  // Verify permission structure
  TestValidator.predicate(
    "permissions has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      permissions.id,
    ),
  );
  TestValidator.predicate(
    "permissions has valid role information",
    permissions.role !== undefined && permissions.role !== null,
  );
  TestValidator.predicate(
    "permissions role has valid name",
    permissions.role.name.length > 0,
  );
  TestValidator.predicate(
    "permissions role has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      permissions.role.id,
    ),
  );
  // Verify the permission code matches expected standard codes
  const expectedPermissionCodes = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:approve",
    "time:view_all",
    "report:view",
  ];
  TestValidator.predicate(
    "permission code is one of the standard codes",
    expectedPermissionCodes.includes(permissions.permission),
  );
}
