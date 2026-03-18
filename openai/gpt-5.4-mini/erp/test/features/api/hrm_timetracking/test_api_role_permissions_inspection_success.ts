import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingPermission";
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

export async function test_api_role_permissions_inspection_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const inspectionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.hrmTimeTracking.member.roles.permissions.getByRoleid(
      inspectionConnection,
      { roleId },
    );
  typia.assert(first);
  const second =
    await api.functional.hrmTimeTracking.member.roles.permissions.getByRoleid(
      inspectionConnection,
      { roleId },
    );
  typia.assert(second);
  TestValidator.equals(
    "role permission inspection should be read-only stable",
    first,
    second,
  );
  TestValidator.equals(
    "inspected role id should match requested role id",
    first.hrm_time_tracking_role_id,
    roleId,
  );
  TestValidator.predicate(
    "permission grant should reference nested role summary",
    first.role.id === first.hrm_time_tracking_role_id,
  );
  TestValidator.predicate(
    "nested role organization summary should exist",
    first.role.organization.id.length > 0,
  );
  TestValidator.predicate(
    "permission summary object should exist",
    typeof first.permission === "object",
  );
}
