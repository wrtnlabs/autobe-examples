import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_delete_blocked_by_active_contract_or_non_owner(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!123",
      displayName: RandomGenerator.name(),
      href: connection.host,
      referrer: connection.host,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-owner must not be allowed to delete an organization",
    async () => {
      await api.functional.erpHrmTime.member.organizations.erase(
        memberConnection,
        {
          organizationId,
        },
      );
    },
  );
  await TestValidator.error(
    "organization deletion with unresolved active contracts must be rejected",
    async () => {
      await api.functional.erpHrmTime.member.organizations.erase(
        memberConnection,
        {
          organizationId,
        },
      );
    },
  );
}
