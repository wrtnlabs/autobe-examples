import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_role_catalog_filtering_preserves_built_in_roles(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPass1234!",
      href: "https://example.com/owners/join",
      referrer: "https://example.com/owners",
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: "https://example.com/logo.png",
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number as number,
        },
      },
    );
  typia.assert(organization);
  const builtInRolesPage =
    await api.functional.hrmTimeTracking.owner.organizations.roles.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          built_in: true,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(builtInRolesPage);
  TestValidator.equals(
    "built-in roles page current is first page",
    builtInRolesPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "built-in roles page limit is preserved",
    builtInRolesPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "built-in roles record count is at least the guaranteed built-in set",
    builtInRolesPage.pagination.records >= 3,
  );
  TestValidator.predicate(
    "built-in roles has at least one page",
    builtInRolesPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "built-in roles data is not empty",
    builtInRolesPage.data.length > 0,
  );
  TestValidator.predicate(
    "all returned roles are built-in",
    builtInRolesPage.data.every((role) => role.built_in === true),
  );
  TestValidator.predicate(
    "all returned roles belong to the created organization",
    builtInRolesPage.data.every(
      (role) => role.organization.id === organization.id,
    ),
  );
  TestValidator.predicate(
    "all returned role organization names match the created organization",
    builtInRolesPage.data.every(
      (role) => role.organization.name === organization.name,
    ),
  );
  TestValidator.predicate(
    "Owner built-in role exists",
    builtInRolesPage.data.some((role) => role.name === "Owner"),
  );
  TestValidator.predicate(
    "Manager built-in role exists",
    builtInRolesPage.data.some((role) => role.name === "Manager"),
  );
  TestValidator.predicate(
    "Employee built-in role exists",
    builtInRolesPage.data.some((role) => role.name === "Employee"),
  );
  const managerRolesPage =
    await api.functional.hrmTimeTracking.owner.organizations.roles.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          search: "Manager",
          built_in: true,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(managerRolesPage);
  TestValidator.equals(
    "manager search current is first page",
    managerRolesPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "manager search limit is preserved",
    managerRolesPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "manager search has records",
    managerRolesPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "manager search has at least one page",
    managerRolesPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "manager search returns only same-organization roles",
    managerRolesPage.data.every(
      (role) => role.organization.id === organization.id,
    ),
  );
  TestValidator.predicate(
    "manager search organization names match the created organization",
    managerRolesPage.data.every(
      (role) => role.organization.name === organization.name,
    ),
  );
  TestValidator.predicate(
    "manager search returns only built-in roles",
    managerRolesPage.data.every((role) => role.built_in === true),
  );
  TestValidator.predicate(
    "manager search includes Manager",
    managerRolesPage.data.some((role) => role.name === "Manager"),
  );
  TestValidator.predicate(
    "manager search results remain aligned with search intent",
    managerRolesPage.data.every(
      (role) => role.name === "Manager" || role.name.includes("Manager"),
    ),
  );
}
