import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_update_selected_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const member = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(12)}@test.com` as string &
          tags.Format<"email">,
        password: "Test1234!" as string & tags.Format<"password">,
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/",
        ip: null,
      },
    },
  );
  typia.assert(member);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  const updated = await api.functional.erpHrmTime.member.departments.update(
    memberConnection,
    {
      departmentId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentDepartmentId: null,
      } satisfies IErpHrmTimeDepartment.IUpdate,
    },
  );
  typia.assert(updated);
}
