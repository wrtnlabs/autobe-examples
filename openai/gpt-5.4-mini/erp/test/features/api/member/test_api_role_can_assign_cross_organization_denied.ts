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

export async function test_api_role_can_assign_cross_organization_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: `tenant-a-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: "Password123!" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/a",
      referrer: "https://example.com/landing/a",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  const foreignRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "cross-organization role assignability lookup must fail closed",
    async () => {
      const output = await api.functional.erpHrmTime.member.roles.canAssign(
        memberAConnection,
        {
          roleId: foreignRoleId,
        },
      );
      typia.assert(output);
      TestValidator.equals(
        "foreign role must not be assignable",
        output.canAssign,
        false,
      );
    },
  );
}
