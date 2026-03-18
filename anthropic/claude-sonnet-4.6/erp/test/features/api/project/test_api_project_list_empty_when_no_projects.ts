import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
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

export async function test_api_project_list_empty_when_no_projects(
  connection: api.IConnection,
): Promise<void> {
  // ─── Setup: Member 1 joins and creates an organization with no projects ───
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  await generate_random_erp_hrm_member_organizations_create(
    member1Connection,
    {},
  );
  // ─── Case 1: Empty request body → should return empty list with defaults ───
  const emptyResult = await api.functional.erpHrm.member.projects.index(
    member1Connection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals("records is 0", emptyResult.pagination.records, 0);
  TestValidator.equals("pages is 0", emptyResult.pagination.pages, 0);
  TestValidator.equals("current page is 1", emptyResult.pagination.current, 1);
  TestValidator.equals("default limit is 20", emptyResult.pagination.limit, 20);
  // ─── Case 2: Status filter with no projects ───
  const filteredResult = await api.functional.erpHrm.member.projects.index(
    member1Connection,
    {
      body: { status: "active" } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(filteredResult);
  TestValidator.equals(
    "filtered empty data array",
    filteredResult.data.length,
    0,
  );
  TestValidator.equals(
    "filtered records is 0",
    filteredResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered pages is 0",
    filteredResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "filtered current page is 1",
    filteredResult.pagination.current,
    1,
  );
  // ─── Case 3: Organization isolation ───
  // Register a second member with their own organization
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  await generate_random_erp_hrm_member_organizations_create(
    member2Connection,
    {},
  );
  // Member 1's project list should still be empty (org isolation)
  const isolationResult = await api.functional.erpHrm.member.projects.index(
    member1Connection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(isolationResult);
  TestValidator.equals(
    "isolation: data still empty",
    isolationResult.data.length,
    0,
  );
  TestValidator.equals(
    "isolation: records still 0",
    isolationResult.pagination.records,
    0,
  );
}
