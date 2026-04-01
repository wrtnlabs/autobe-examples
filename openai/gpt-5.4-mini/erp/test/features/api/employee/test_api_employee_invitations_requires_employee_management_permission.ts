import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeInvitation";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_invitations_requires_employee_management_permission(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      name: RandomGenerator.name(),
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  await TestValidator.httpError(
    "member without employee management permission cannot browse invitations",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.employees.invitations.index(
        unauthorizedConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeEmployeeInvitation.IRequest,
        },
      );
    },
  );
}
