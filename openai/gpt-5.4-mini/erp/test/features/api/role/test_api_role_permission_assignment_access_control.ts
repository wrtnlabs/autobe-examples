import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { generate_random_erp_hrm_time_member_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_permissions_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";
import { prepare_random_erp_hrm_time_role_permission } from "../../../prepare/prepare_random_erp_hrm_time_role_permission";

export async function test_api_role_permission_assignment_access_control(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(owner);
  const permissionsPage =
    await api.functional.erpHrmTime.member.permissions.index(ownerConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimePermission.IRequest,
    });
  typia.assert(permissionsPage);
  TestValidator.predicate(
    "permission catalog should contain at least one permission",
    permissionsPage.data.length > 0,
  );
  const approvedPermission = permissionsPage.data[0];
  const primaryOrganization =
    await generate_random_erp_hrm_time_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: `${RandomGenerator.name()} Primary`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(primaryOrganization);
  const foreignRole = await generate_random_erp_hrm_time_member_roles_create(
    ownerConnection,
    {
      body: {
        name: `${RandomGenerator.name()} Role`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(foreignRole);
  const regularConnection: api.IConnection = { host: connection.host };
  const regular = await authorize_member_join(regularConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}+member@test.com`,
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(regular);
  await TestValidator.httpError(
    "regular member cannot assign permission to a role without role administration rights",
    [400, 401, 403],
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.create(
        regularConnection,
        {
          roleId: foreignRole.id,
          body: {
            erpHrmTimePermissionId: approvedPermission.id,
          } satisfies IErpHrmTimeRolePermission.ICreate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "cross-organization role permission assignment must be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.create(
        ownerConnection,
        {
          roleId: foreignRole.id,
          body: {
            erpHrmTimePermissionId: approvedPermission.id,
          } satisfies IErpHrmTimeRolePermission.ICreate,
        },
      );
    },
  );
}
