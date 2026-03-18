import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_list_text_search_filtering(
  connection: api.IConnection,
) {
  // 1. Member authorization - create organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create departments with distinctive names and descriptions
  const prefix = RandomGenerator.alphabets(5);
  const marketingDept = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {
      body: {
        name: `${prefix} Marketing Department`,
        description: `Marketing team description with keyword ${prefix}`,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(marketingDept);
  const salesDept = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {
      body: {
        name: `${prefix} Sales Department`,
        description: `Sales division handles revenue with ${prefix}`,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(salesDept);
  const engineeringDept =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: `${prefix} Engineering Department`,
        description: `Engineering builds products with ${prefix}`,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(engineeringDept);
  // 4. Test text search by name - partial matching for Marketing
  const marketingSearch = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        name: `${prefix} Marketing`,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(marketingSearch);
  TestValidator.predicate(
    "name search returns departments with matching name",
    marketingSearch.data.some(
      (d: IErpHrmDepartment.ISummary) => d.id === marketingDept.id,
    ) &&
      !marketingSearch.data.some(
        (d: IErpHrmDepartment.ISummary) => d.id === salesDept.id,
      ),
  );
  // 5. Test text search by name - partial matching for Sales
  const salesSearch = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        name: `${prefix} Sales`,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(salesSearch);
  TestValidator.predicate(
    "sales name search returns only sales department",
    salesSearch.data.some(
      (d: IErpHrmDepartment.ISummary) => d.id === salesDept.id,
    ) &&
      !salesSearch.data.some(
        (d: IErpHrmDepartment.ISummary) => d.id === marketingDept.id,
      ),
  );
  // 6. Test case-insensitive name search
  const lowerCaseSearch = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        name: `${prefix.toLowerCase()} engineering`,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(lowerCaseSearch);
  TestValidator.predicate(
    "lowercase name search returns engineering department",
    lowerCaseSearch.data.some(
      (d: IErpHrmDepartment.ISummary) => d.id === engineeringDept.id,
    ),
  );
  // 7. Test text search by description
  const descriptionSearch =
    await api.functional.erpHrm.member.departments.index(memberConnection, {
      body: {
        description: "revenue",
      } satisfies IErpHrmDepartment.IRequest,
    });
  typia.assert(descriptionSearch);
  TestValidator.predicate(
    "description search returns departments with matching description",
    descriptionSearch.data.some(
      (d: IErpHrmDepartment.ISummary) => d.id === salesDept.id,
    ),
  );
  // 8. Test combined name and description search
  const combinedSearch = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        name: prefix,
        description: "team",
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined filters return departments matching both criteria",
    combinedSearch.data.some(
      (d: IErpHrmDepartment.ISummary) => d.id === marketingDept.id,
    ),
  );
  // 9. Test search with no matches
  const noMatchSearch = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        name: `${RandomGenerator.alphabets(10)}NonExistentXYZ123`,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "non-existent search returns empty data array",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent search returns zero records in pagination",
    noMatchSearch.pagination.records,
    0,
  );
  // 10. Test empty search (no filters) returns all departments for organization
  const allSearch = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(allSearch);
  TestValidator.predicate(
    "empty search returns all created departments for organization",
    allSearch.data.length >= 3 &&
      allSearch.data.some(
        (d: IErpHrmDepartment.ISummary) => d.id === marketingDept.id,
      ) &&
      allSearch.data.some(
        (d: IErpHrmDepartment.ISummary) => d.id === salesDept.id,
      ) &&
      allSearch.data.some(
        (d: IErpHrmDepartment.ISummary) => d.id === engineeringDept.id,
      ),
  );
}
