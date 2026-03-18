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
import type { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_list_with_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member and create connection
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create organization (owner is auto-assigned as org member)
  const org = await generate_random_erp_hrm_member_organizations_create(
    ownerConnection,
    {},
  );
  typia.assert(org);
  // Get the owner's role id from the organization owner record
  const ownerRoleId = org.owner.role.id;
  // 3. Register platform members B, C, D
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {});
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberDAuth = await authorize_member_join(memberDConnection, {});
  // 4. Create department
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      ownerConnection,
      {
        params: { organizationId: org.id },
      },
    );
  typia.assert(department);
  // 5. Create org member B: part-time, position='Project Coordinator'
  const memberB =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: memberBAuth.member.id,
          roleId: ownerRoleId,
          employmentType: "part-time",
          position: "Project Coordinator",
        },
      },
    );
  typia.assert(memberB);
  // 6. Create org member C: full-time, position='Senior Engineer'
  const memberC =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: memberCAuth.member.id,
          roleId: ownerRoleId,
          employmentType: "full-time",
          position: "Senior Engineer",
        },
      },
    );
  typia.assert(memberC);
  // 7. Create org member D: full-time, with department
  const memberD =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: memberDAuth.member.id,
          roleId: ownerRoleId,
          employmentType: "full-time",
          departmentId: department.id,
          position: "Department Lead",
        },
      },
    );
  typia.assert(memberD);
  // === FILTER TEST 1: Combined filters: employment_type='full-time' + keyword='Senior' ===
  // Should return only Member C (full-time + position contains 'Senior')
  const combinedFilterResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      ownerConnection,
      {
        body: {
          employment_type: "full-time",
          keyword: "Senior",
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Member C should be in results
  TestValidator.predicate(
    "combined filter: Member C (full-time + Senior) should appear",
    combinedFilterResult.data.some((m) => m.id === memberC.id),
  );
  // Member B should NOT be in results (part-time)
  TestValidator.predicate(
    "combined filter: Member B (part-time) should be excluded",
    !combinedFilterResult.data.some((m) => m.id === memberB.id),
  );
  // Member D should NOT be in results (full-time but no 'Senior' in position)
  TestValidator.predicate(
    "combined filter: Member D (Department Lead) should be excluded",
    !combinedFilterResult.data.some((m) => m.id === memberD.id),
  );
  // === FILTER TEST 2: employment_type='part-time' only ===
  const partTimeResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      ownerConnection,
      {
        body: {
          employment_type: "part-time",
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(partTimeResult);
  TestValidator.predicate(
    "part-time filter: Member B should appear",
    partTimeResult.data.some((m) => m.id === memberB.id),
  );
  TestValidator.predicate(
    "part-time filter: Member C (full-time) should be excluded",
    !partTimeResult.data.some((m) => m.id === memberC.id),
  );
  // === FILTER TEST 3: No matching members (employment_type='intern' + keyword='NonExistent') ===
  const noMatchResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      ownerConnection,
      {
        body: {
          employment_type: "intern",
          keyword: "NonExistentKeyword12345",
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match: data array should be empty",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match: pagination records should be 0",
    noMatchResult.pagination.records,
    0,
  );
  // === FILTER TEST 4: role_id filter ===
  // Use Member C's role id - should return at least Member C
  const roleFilterResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      ownerConnection,
      {
        body: {
          role_id: memberC.role.id,
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(roleFilterResult);
  TestValidator.predicate(
    "role filter: Member C should appear with its role",
    roleFilterResult.data.some((m) => m.id === memberC.id),
  );
  // All returned members should have the same role id
  TestValidator.predicate(
    "role filter: all returned members have the specified role",
    roleFilterResult.data.every((m) => m.role.id === memberC.role.id),
  );
  // === FILTER TEST 5: department_id filter ===
  const departmentFilterResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      ownerConnection,
      {
        body: {
          department_id: department.id,
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(departmentFilterResult);
  TestValidator.predicate(
    "department filter: Member D should appear",
    departmentFilterResult.data.some((m) => m.id === memberD.id),
  );
  TestValidator.predicate(
    "department filter: Member B (no department) should be excluded",
    !departmentFilterResult.data.some((m) => m.id === memberB.id),
  );
  // === FILTER TEST 6: Pagination ===
  // With limit=1 and page=2, should return 2nd member
  const paginationResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      ownerConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination: current page should be 2",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination: limit should be 1",
    paginationResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination: page 2 should have 1 member",
    paginationResult.data.length === 1,
  );
}
