import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_permission_retrieve_without_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.erpHrmTime.auth.member.join(
    memberConnection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
          tags.Format<"email">,
        password: "P@ssw0rd1234!" satisfies string & tags.Format<"password">,
        name: RandomGenerator.name(),
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/landing" satisfies string &
          tags.Format<"uri">,
        ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(authorized);
  const permission = await api.functional.erpHrmTime.member.permissions.at(
    memberConnection,
    {
      permissionId: authorized.id,
    },
  );
  typia.assert(permission);
  const otherConnection: api.IConnection = { host: connection.host };
  const samePermission = await api.functional.erpHrmTime.member.permissions.at(
    otherConnection,
    {
      permissionId: authorized.id,
    },
  );
  typia.assert(samePermission);
  TestValidator.equals(
    "permission lookup should be stable across connections",
    permission,
    samePermission,
  );
}
