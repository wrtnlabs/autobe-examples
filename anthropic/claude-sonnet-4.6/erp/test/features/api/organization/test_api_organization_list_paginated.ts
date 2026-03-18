import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create 3 organizations with distinct names
  const org1 = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org1);
  const org2 = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org2);
  const org3 = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org3);
  const createdOrgIds = [org1.id, org2.id, org3.id];
  // 3. Primary success test: call with empty request body (default pagination)
  const allOrgsPage = await api.functional.erpHrm.member.organizations.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(allOrgsPage);
  // 5. Assert all 3 created organizations appear in the data
  for (const orgId of createdOrgIds) {
    TestValidator.predicate(
      `org ${orgId} present in list`,
      allOrgsPage.data.some((org) => org.id === orgId),
    );
  }
  // 6. Assert pagination metadata is accurate
  TestValidator.predicate("records >= 3", allOrgsPage.pagination.records >= 3);
  TestValidator.predicate("pages > 0", allOrgsPage.pagination.pages > 0);
  // 7. Pagination test: request page 1, limit 1
  const pagedResult = await api.functional.erpHrm.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(pagedResult);
  // 8. Assert only 1 organization returned in data
  TestValidator.predicate(
    "paged data length equals 1",
    pagedResult.data.length === 1,
  );
  // 8. Assert records total equals the total count from the first query
  TestValidator.predicate(
    "records total matches",
    pagedResult.pagination.records === allOrgsPage.pagination.records,
  );
  // 9. Assert pages = ceiling(records / limit)
  TestValidator.predicate(
    "pages equals ceil(records/limit)",
    pagedResult.pagination.pages ===
      Math.ceil(pagedResult.pagination.records / pagedResult.pagination.limit),
  );
  // 10. Edge case: name filter that matches no organization
  const noMatchName = `NOMATCH_${typia.random<string & tags.Format<"uuid">>()}`;
  const emptyResult = await api.functional.erpHrm.member.organizations.index(
    memberConnection,
    {
      body: {
        name: noMatchName,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(emptyResult);
  // 11. Assert empty data, records: 0, pages: 0
  TestValidator.predicate(
    "empty data array length is 0",
    emptyResult.data.length === 0,
  );
  TestValidator.predicate(
    "empty records count is 0",
    emptyResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty pages count is 0",
    emptyResult.pagination.pages === 0,
  );
}
