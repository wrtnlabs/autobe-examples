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

export async function test_api_role_deletion_check_custom_role_deletable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorization);
  const roleIdHeader = connection.headers?.["x-role-id"];
  if (typeof roleIdHeader !== "string" || roleIdHeader.length === 0) {
    throw new Error(
      "Missing x-role-id header for a custom role deletion-check fixture",
    );
  }
  const roleId = roleIdHeader as string & tags.Format<"uuid">;
  const output = await api.functional.erpHrmTime.member.roles.deletion_check.at(
    memberConnection,
    {
      roleId,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "role should be deletable",
    output.deletable === true,
  );
  TestValidator.equals("deletion reasons should be empty", output.reasons, []);
}
