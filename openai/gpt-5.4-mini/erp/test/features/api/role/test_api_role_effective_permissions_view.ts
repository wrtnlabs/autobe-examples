import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_effective_permissions_view(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.erpHrmTime.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234!",
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(authorized);
  const effectivePermission =
    await api.functional.erpHrmTime.member.roles.permissions.effective.at(
      memberConnection,
      {
        roleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(effectivePermission);
  TestValidator.predicate(
    "permission key is non-empty",
    effectivePermission.key.length > 0,
  );
  TestValidator.predicate(
    "permission description is non-empty",
    effectivePermission.description.length > 0,
  );
}
