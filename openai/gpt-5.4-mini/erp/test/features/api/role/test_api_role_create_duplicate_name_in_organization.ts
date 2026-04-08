import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_role_create_duplicate_name_in_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `role-duplicate-${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/auth/member/join",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  memberConnection.headers = {
    Authorization: joined.token.access,
  };
  const roleName = `duplicate-role-${typia.random<string & tags.Format<"uuid">>()}`;
  const permission = typia.random<IErpHrmTimePermission.ISummary>();
  const created = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: roleName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [permission],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(created);
  TestValidator.equals("created role name", created.name, roleName);
  TestValidator.equals("created role is builtin", created.isBuiltin, false);
  TestValidator.equals(
    "created role permission count",
    created.permissions.length,
    1,
  );
  await TestValidator.error("duplicate role name should fail", async () => {
    await generate_random_erp_hrm_time_member_roles_create(memberConnection, {
      body: {
        name: roleName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [permission],
      } satisfies IErpHrmTimeRole.ICreate,
    });
  });
}
