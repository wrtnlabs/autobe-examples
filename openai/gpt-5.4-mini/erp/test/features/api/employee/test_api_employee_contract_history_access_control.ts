import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeEmployeeContractHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContractHistory";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_contract_history_access_control(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string as string &
          tags.Format<"email">,
      password: "P@ssw0rd123!" satisfies string as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/signup" as string & tags.Format<"uri">,
      referrer: "https://example.com/landing" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member.token.access}` },
  };
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(8)}-other@example.com` satisfies string as string &
          tags.Format<"email">,
      password: "P@ssw0rd123!" satisfies string as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/signup" as string & tags.Format<"uri">,
      referrer: "https://example.com/landing" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherMember);
  const otherAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${otherMember.token.access}` },
  };
  const foreignEmployeeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "contract history access should be denied for a foreign employee identifier",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.history(
        authorizedConnection,
        {
          employeeId: foreignEmployeeId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "contract history access should remain denied for another authenticated member without employee-view scope",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.history(
        otherAuthorizedConnection,
        {
          employeeId: foreignEmployeeId,
        },
      );
    },
  );
}
