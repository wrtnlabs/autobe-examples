import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_role_create_duplicate_name_in_same_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!1" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const roleName = `role-${RandomGenerator.alphabets(8)}`;
  const firstBody = {
    name: roleName,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IErpHrmTimeRole.ICreate;
  const firstRole = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: firstBody,
    },
  );
  typia.assert(firstRole);
  const duplicateBody = {
    name: roleName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IErpHrmTimeRole.ICreate;
  await TestValidator.error(
    "duplicate role name in same organization should be rejected",
    async () => {
      await generate_random_erp_hrm_time_member_roles_create(memberConnection, {
        body: duplicateBody,
      });
    },
  );
  TestValidator.equals(
    "original role name remains unchanged",
    firstRole.name,
    roleName,
  );
  TestValidator.equals(
    "original role description remains unchanged",
    firstRole.description,
    firstBody.description ?? null,
  );
  TestValidator.predicate(
    "created role belongs to an organization",
    firstRole.organization !== null,
  );
}
