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

export async function test_api_role_deletion_check_builtin_role_blocked(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm-time/join",
      referrer: "https://example.com/erp/hrm-time/register",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const builtInRoleId = typia.random<string & tags.Format<"uuid">>();
  const first = await api.functional.erpHrmTime.member.roles.deletion_check.at(
    memberConnection,
    { roleId: builtInRoleId },
  );
  typia.assert(first);
  const second = await api.functional.erpHrmTime.member.roles.deletion_check.at(
    memberConnection,
    { roleId: builtInRoleId },
  );
  typia.assert(second);
  TestValidator.equals(
    "built-in role is not deletable",
    first.deletable,
    false,
  );
  TestValidator.equals("deletion check is stable", second, first);
  TestValidator.predicate(
    "blocker reasons mention built-in role protection",
    first.reasons.length > 0 &&
      first.reasons.some(
        (reason) =>
          reason.includes("built-in") ||
          reason.includes("protected") ||
          reason.includes("cannot be deleted"),
      ),
  );
}
