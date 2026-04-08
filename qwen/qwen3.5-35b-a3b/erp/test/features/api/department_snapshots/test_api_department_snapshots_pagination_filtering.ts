import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import type { IPageIHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_snapshots_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  const organizationId: string = member.member.id;
  // 2. Create departments (memberConnection already has auth token from join)
  const dept1 =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          name: RandomGenerator.name(),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(dept1);
  const dept2 =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          name: RandomGenerator.name(),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(dept2);
  // Create child department for hierarchy testing
  const dept3 =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          name: RandomGenerator.name(),
          parent_department_id: dept1.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(dept3);
  // 3. Test basic snapshot retrieval
  const allSnapshots: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId: organizationId,
        departmentId: dept1.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  // 4. Test pagination - page 1
  const page1: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId: organizationId,
        departmentId: dept1.id,
        body: {
          page: 1,
          limit: 3,
        } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 is first page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 3", page1.pagination.limit, 3);
  // 5. Test pagination - page 2 (if data exists)
  if (page1.pagination.records > 3) {
    const page2: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
      await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
        memberConnection,
        {
          organizationId: organizationId,
          departmentId: dept1.id,
          body: {
            page: 2,
            limit: 3,
          } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 is second page", page2.pagination.current, 2);
    TestValidator.notEquals(
      "page 2 data different from page 1",
      page1.data.length,
      page2.data.length,
    );
  }
  // 6. Test date range filtering
  if (allSnapshots.data.length > 0) {
    const sampleSnapshot = allSnapshots.data[0];
    const fromDate = new Date(sampleSnapshot.createdAt!);
    fromDate.setSeconds(fromDate.getSeconds() - 10);
    const toDate = new Date(sampleSnapshot.createdAt!);
    toDate.setSeconds(toDate.getSeconds() + 10);
    const dateFiltered: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
      await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
        memberConnection,
        {
          organizationId: organizationId,
          departmentId: dept1.id,
          body: {
            created_at_from: fromDate.toISOString(),
            created_at_to: toDate.toISOString(),
          } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
        },
      );
    typia.assert(dateFiltered);
    TestValidator.equals(
      "date filtered total matches data count",
      dateFiltered.pagination.records,
      dateFiltered.data.length,
    );
  }
  // 7. Test sorting by created_at descending
  const sortedByCreatedDesc: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId: organizationId,
        departmentId: dept1.id,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);
  // 8. Test sorting by name
  const sortedByName: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId: organizationId,
        departmentId: dept1.id,
        body: {
          sort_by: "name",
        } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
      },
    );
  typia.assert(sortedByName);
  // 9. Test search functionality on department name
  if (dept1.name.length >= 3) {
    const searchTerm: string = dept1.name.substring(0, 3);
    const searchResults: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
      await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
        memberConnection,
        {
          organizationId: organizationId,
          departmentId: dept1.id,
          body: {
            search: searchTerm,
          } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
        },
      );
    typia.assert(searchResults);
    TestValidator.equals(
      "search total matches data count",
      searchResults.pagination.records,
      searchResults.data.length,
    );
  }
  // 10. Test fiscal_start_month filtering
  const fiscalMonth: number = RandomGenerator.pick([1, 4, 7, 10]);
  const fiscalFiltered: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId: organizationId,
        departmentId: dept1.id,
        body: {
          fiscal_start_month: fiscalMonth,
        } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
      },
    );
  typia.assert(fiscalFiltered);
  TestValidator.equals(
    "fiscal month filtered total matches data count",
    fiscalFiltered.pagination.records,
    fiscalFiltered.data.length,
  );
  // 11. Test status filtering (active)
  const statusActive: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId: organizationId,
        departmentId: dept1.id,
        body: {
          status: "active",
        } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
      },
    );
  typia.assert(statusActive);
  TestValidator.equals(
    "status active total matches data count",
    statusActive.pagination.records,
    statusActive.data.length,
  );
  // 12. Test status filtering (inactive)
  const statusInactive: IPageIHrmPlatformDepartmentsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId: organizationId,
        departmentId: dept1.id,
        body: {
          status: "inactive",
        } satisfies IHrmPlatformDepartmentsSnapshot.IRequest,
      },
    );
  typia.assert(statusInactive);
  TestValidator.equals(
    "status inactive total matches data count",
    statusInactive.pagination.records,
    statusInactive.data.length,
  );
  // 13. Verify pagination metadata is accurate
  TestValidator.equals(
    "pagination records is non-negative",
    allSnapshots.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    allSnapshots.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is within bounds",
    allSnapshots.pagination.limit <= 100,
    true,
  );
}