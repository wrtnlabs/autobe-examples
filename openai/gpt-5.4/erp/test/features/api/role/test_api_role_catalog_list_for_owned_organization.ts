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

export async function test_api_role_catalog_list_for_owned_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const request = {
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingRole.IRequest;
  const page =
    await api.functional.hrmTimeTracking.owner.organizations.roles.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current is positive",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit covers current page size",
    page.pagination.limit >= page.data.length,
  );
  TestValidator.predicate(
    "pagination records cover current page size",
    page.pagination.records >= page.data.length,
  );
  TestValidator.equals(
    "pagination pages follow records and limit",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  TestValidator.predicate(
    "current page does not exceed total pages when pages exist",
    page.pagination.pages === 0 ||
      page.pagination.current <= page.pagination.pages,
  );
  for (const role of page.data) {
    TestValidator.equals(
      "role belongs to requested organization",
      role.organization.id,
      organization.id,
    );
    TestValidator.equals(
      "nested organization name matches created organization",
      role.organization.name,
      organization.name,
    );
    TestValidator.equals(
      "nested organization description matches created organization",
      role.organization.description,
      organization.description,
    );
    TestValidator.equals(
      "nested organization logo matches created organization",
      role.organization.logo_uri,
      organization.logo_uri,
    );
    TestValidator.equals(
      "nested organization currency matches created organization",
      role.organization.currency_code,
      organization.currency_code,
    );
    TestValidator.equals(
      "nested organization timezone matches created organization",
      role.organization.timezone,
      organization.timezone,
    );
    TestValidator.equals(
      "nested organization fiscal start month matches created organization",
      role.organization.fiscal_start_month,
      organization.fiscal_start_month,
    );
  }
  const builtInRoles = page.data.filter((role) => role.built_in === true);
  TestValidator.predicate(
    "at least one built-in role is present",
    builtInRoles.length > 0,
  );
  TestValidator.predicate(
    "built-in Owner role is present",
    ArrayUtil.has(
      page.data,
      (role) => role.name === "Owner" && role.built_in === true,
    ),
  );
  TestValidator.predicate(
    "built-in Manager role is present",
    ArrayUtil.has(
      page.data,
      (role) => role.name === "Manager" && role.built_in === true,
    ),
  );
  TestValidator.predicate(
    "built-in Employee role is present",
    ArrayUtil.has(
      page.data,
      (role) => role.name === "Employee" && role.built_in === true,
    ),
  );
}
