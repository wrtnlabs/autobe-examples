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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_members_list_no_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  const memberEmail = memberAuth.email;
  // 2. Create an organization — the member automatically becomes the owner
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. List members with no filters
  const result = await api.functional.erpHrm.member.organizations.members.index(
    memberConnection,
    {
      organizationId: organization.id,
      body: {} satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(result);
  // 4. Assert exactly one member (the owner)
  TestValidator.equals("member count is 1", result.data.length, 1);
  const owner = result.data[0]!;
  // 5. Assert the owner's email matches the registered email
  TestValidator.equals("owner email matches", owner.member.email, memberEmail);
  // 6. Assert employment_type is one of the valid values
  const validEmploymentTypes = [
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ] as const;
  TestValidator.predicate(
    "employment_type is valid",
    validEmploymentTypes.includes(
      owner.employment_type as (typeof validEmploymentTypes)[number],
    ),
  );
  // 7. Assert status is active
  TestValidator.equals("status is active", owner.status, "active");
  // 8. Assert role is non-null and is built-in
  TestValidator.predicate(
    "role is non-null",
    owner.role !== null && owner.role !== undefined,
  );
  TestValidator.equals("role is builtin", owner.role.is_builtin, true);
  // 9. Assert department is null
  TestValidator.equals("department is null", owner.department, null);
  // 10. Assert pagination metadata
  TestValidator.equals("pagination current is 1", result.pagination.current, 1);
  TestValidator.equals("pagination records is 1", result.pagination.records, 1);
  TestValidator.equals("pagination pages is 1", result.pagination.pages, 1);
  TestValidator.predicate(
    "pagination limit >= 1",
    result.pagination.limit >= 1,
  );
  // 11. Call again with explicit page=1 and limit=20 — same result expected
  const result2 =
    await api.functional.erpHrm.member.organizations.members.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "explicit page: member count is 1",
    result2.data.length,
    1,
  );
  TestValidator.equals(
    "explicit page: owner email matches",
    result2.data[0]!.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "explicit page: pagination current is 1",
    result2.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit page: pagination records is 1",
    result2.pagination.records,
    1,
  );
  TestValidator.equals(
    "explicit page: pagination pages is 1",
    result2.pagination.pages,
    1,
  );
}
