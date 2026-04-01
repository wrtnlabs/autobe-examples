import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";
import { prepare_random_erp_hrm_time_role_permission } from "../../../prepare/prepare_random_erp_hrm_time_role_permission";

export async function test_api_role_cross_organization_update_isolated(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<(string & tags.Format<"ipv4">) | null | undefined>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organizationAConnection: api.IConnection = { host: connection.host };
  organizationAConnection.headers = { Authorization: member.token.access };
  const organizationA =
    await generate_random_erp_hrm_time_member_organizations_create(
      organizationAConnection,
      {
        body: {
          name: `${RandomGenerator.name()} A`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(organizationA);
  const organizationBConnection: api.IConnection = { host: connection.host };
  organizationBConnection.headers = { Authorization: member.token.access };
  const organizationB =
    await generate_random_erp_hrm_time_member_organizations_create(
      organizationBConnection,
      {
        body: {
          name: `${RandomGenerator.name()} B`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(organizationB);
  const selectedOrganizationAConnection: api.IConnection = {
    host: connection.host,
  };
  selectedOrganizationAConnection.headers = {
    Authorization: member.token.access,
  };
  const foreignRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "cross-organization role update should be not found",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.roles.update(
        selectedOrganizationAConnection,
        {
          roleId: foreignRoleId,
          body: {
            name: `${RandomGenerator.name()} updated`,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IErpHrmTimeRole.IUpdate,
        },
      );
    },
  );
  TestValidator.notEquals(
    "organizations should remain distinct",
    organizationA.id,
    organizationB.id,
  );
}
