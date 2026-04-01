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

export async function test_api_role_create_custom_role_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const permissions: IErpHrmTimePermission.ISummary[] = ArrayUtil.repeat(
    2,
    () => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      key: RandomGenerator.alphabets(8),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    }),
  );
  const createBody = {
    name: `custom-role-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    permissions,
  } satisfies IErpHrmTimeRole.ICreate;
  const created = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    { body: createBody },
  );
  typia.assert(created);
  TestValidator.equals("created role name", created.name, createBody.name);
  TestValidator.equals(
    "created role description",
    created.description,
    createBody.description,
  );
  TestValidator.predicate("role is custom", created.isBuiltin === false);
  TestValidator.equals(
    "permission count",
    created.permissions.length,
    permissions.length,
  );
  const secondConnection: api.IConnection = { host: connection.host };
  const secondJoined = await authorize_member_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(secondJoined);
  const secondCreated = await generate_random_erp_hrm_time_member_roles_create(
    secondConnection,
    {
      body: {
        name: createBody.name,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions,
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(secondCreated);
  TestValidator.equals("second role name", secondCreated.name, createBody.name);
  TestValidator.predicate(
    "second role is custom",
    secondCreated.isBuiltin === false,
  );
  TestValidator.notEquals("role ids differ", created.id, secondCreated.id);
}
