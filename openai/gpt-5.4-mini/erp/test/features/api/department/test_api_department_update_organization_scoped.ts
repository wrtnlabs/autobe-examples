import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";

export async function test_api_department_update_organization_scoped(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const otherOwnerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `member-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const otherOwner = await authorize_member_join(otherOwnerConnection, {
    body: {
      email: `other-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherOwner);
  const ownerOrgConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: owner.token.access },
  };
  const memberOrgConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  const otherOrgConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: otherOwner.token.access },
  };
  const targetDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      ownerOrgConnection,
      {
        body: {
          name: `engineering-${RandomGenerator.alphaNumeric(8)}`,
          description: "Initial engineering department",
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(targetDepartment);
  const parentDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      ownerOrgConnection,
      {
        body: {
          name: `operations-${RandomGenerator.alphaNumeric(8)}`,
          description: "Parent department",
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  const foreignDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      otherOrgConnection,
      {
        body: {
          name: `finance-${RandomGenerator.alphaNumeric(8)}`,
          description: "Other organization department",
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(foreignDepartment);
  const beforeCreatedAt = targetDepartment.createdAt;
  const beforeOrganizationId = targetDepartment.organization.id;
  const updatedDepartment =
    await api.functional.erpHrmTime.member.departments.update(
      ownerOrgConnection,
      {
        departmentId: targetDepartment.id,
        body: {
          name: `engineering-updated-${RandomGenerator.alphaNumeric(8)}`,
          description: "Updated engineering description",
          parentDepartmentId: parentDepartment.id,
        } satisfies IErpHrmTimeDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  TestValidator.equals(
    "department id should remain the same",
    updatedDepartment.id,
    targetDepartment.id,
  );
  TestValidator.equals(
    "organization id should remain the same",
    updatedDepartment.organization.id,
    beforeOrganizationId,
  );
  TestValidator.notEquals(
    "department name should change",
    targetDepartment.name,
    updatedDepartment.name,
  );
  TestValidator.equals(
    "updated department description",
    updatedDepartment.description,
    "Updated engineering description",
  );
  TestValidator.equals(
    "parent department should update",
    updatedDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "createdAt should remain unchanged",
    updatedDepartment.createdAt,
    beforeCreatedAt,
  );
  TestValidator.equals(
    "deletedAt should remain null",
    updatedDepartment.deletedAt,
    null,
  );
  await TestValidator.error(
    "should reject cross-organization department update",
    async () => {
      await api.functional.erpHrmTime.member.departments.update(
        otherOrgConnection,
        {
          departmentId: targetDepartment.id,
          body: {
            name: `cross-tenant-${RandomGenerator.alphaNumeric(8)}`,
            description: "attempted cross org update",
            parentDepartmentId: foreignDepartment.id,
          } satisfies IErpHrmTimeDepartment.IUpdate,
        },
      );
    },
  );
  const foreignDepartmentStillAccessible =
    await api.functional.erpHrmTime.member.departments.update(
      otherOrgConnection,
      {
        departmentId: foreignDepartment.id,
        body: {
          name: `finance-updated-${RandomGenerator.alphaNumeric(8)}`,
          description: "Other organization department updated",
        } satisfies IErpHrmTimeDepartment.IUpdate,
      },
    );
  typia.assert(foreignDepartmentStillAccessible);
  TestValidator.equals(
    "foreign department should still belong to its organization",
    foreignDepartmentStillAccessible.organization.id,
    foreignDepartment.organization.id,
  );
}
