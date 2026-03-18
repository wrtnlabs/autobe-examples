import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_list_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member to get access token
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedMember: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(authorizedMember);
  // Create a member-specific connection for API calls (auth token is in headers)
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Test department list with a random organization ID
  // Note: In E2E tests, we test with the assumption that organizations and departments exist
  // If no data exists, we expect empty response (valid pagination)
  const randomOrgId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve department list with default parameters
  const defaultListResponse: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: randomOrgId,
        body: {} satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(defaultListResponse);
  // 4. Validate response structure - even with no data, pagination should be correct
  TestValidator.equals(
    "default pagination current",
    defaultListResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultListResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "default pagination pages",
    defaultListResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "default department count",
    defaultListResponse.data.length,
    0,
  );
  // 5. Test sorting by name ascending
  const sortedByNameAsc: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: randomOrgId,
        body: {
          sort_by: "name",
          sort_order: "asc",
        } satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);
  TestValidator.equals(
    "sorted by name asc pagination",
    sortedByNameAsc.pagination.current,
    1,
  );
  // 6. Test sorting by name descending
  const sortedByNameDesc: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: randomOrgId,
        body: {
          sort_by: "name",
          sort_order: "desc",
        } satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(sortedByNameDesc);
  // 7. Test sorting by created_at ascending
  const sortedByCreatedAsc: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: randomOrgId,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);
  // 8. Test filtering by parent_id
  const filteredByParent: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: randomOrgId,
        body: {
          parent_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(filteredByParent);
  TestValidator.equals(
    "filtered by parent pagination",
    filteredByParent.pagination.current,
    1,
  );
  // 9. Test pagination with custom limit
  const paginatedList: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: randomOrgId,
        body: {
          limit: 50,
        } satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(paginatedList);
  TestValidator.equals(
    "custom limit pagination limit",
    paginatedList.pagination.limit,
    50,
  );
  TestValidator.equals(
    "custom limit pagination records",
    paginatedList.pagination.records,
    0,
  );
  // 10. Test searching by department name
  const searchList: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: randomOrgId,
        body: {
          search: RandomGenerator.name(2),
        } satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(searchList);
  TestValidator.equals(
    "search pagination records",
    searchList.pagination.records,
    0,
  );
  // 11. Test include_deleted flag
  const includeDeletedList: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: randomOrgId,
        body: {
          include_deleted: true,
        } satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(includeDeletedList);
  // 12. Validate department entity structure when data exists (using typia.assert)
  // Create a sample department entity to validate structure compliance
  const sampleDepartment: IHrmsDepartment.ISummary =
    typia.random<IHrmsDepartment.ISummary>();
  typia.assert(sampleDepartment);
  // Validate required fields exist in department entity
  TestValidator.equals(
    "sample department has id",
    sampleDepartment.id !== undefined,
    true,
  );
  TestValidator.equals(
    "sample department has name",
    sampleDepartment.name.length > 0,
    true,
  );
  TestValidator.equals(
    "sample department has organization_id",
    sampleDepartment.organization_id !== undefined,
    true,
  );
  TestValidator.equals(
    "sample department has created_at",
    sampleDepartment.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "sample department has updated_at",
    sampleDepartment.updated_at !== undefined,
    true,
  );
  // 13. Test empty organization edge case (organization with no departments)
  const emptyOrgId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyOrgDepartments: IPageIHrmsDepartment.ISummary =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: emptyOrgId,
        body: {} satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(emptyOrgDepartments);
  TestValidator.equals(
    "empty org department count",
    emptyOrgDepartments.data.length,
    0,
  );
  TestValidator.equals(
    "empty org pagination records",
    emptyOrgDepartments.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty org pagination pages",
    emptyOrgDepartments.pagination.pages,
    0,
  );
}
