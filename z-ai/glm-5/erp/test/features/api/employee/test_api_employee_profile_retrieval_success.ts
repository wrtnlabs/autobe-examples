import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member - this automatically creates their first organization
  // and assigns them as owner with an active employee record
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      avatarImage: typia.random<string & tags.Format<"url">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Store the registered email for verification
  const registeredEmail = joinResult.email;
  // Retrieve the current employee's profile
  const employee =
    await api.functional.erpHrm.member.employees.me.at(memberConnection);
  typia.assert(employee);
  // Validate employee ID is a valid UUID
  TestValidator.predicate("employee id is valid uuid", () => {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(employee.id);
  });
  // Validate member profile information
  TestValidator.equals(
    "member email matches registered email",
    employee.member.email,
    registeredEmail,
  );
  TestValidator.predicate(
    "member display name exists",
    () => employee.member.displayName.length > 0,
  );
  TestValidator.predicate("member id is valid uuid", () => {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(employee.member.id);
  });
  // Validate organization information
  TestValidator.predicate("organization id is valid uuid", () => {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(employee.organization.id);
  });
  TestValidator.predicate(
    "organization name exists",
    () => employee.organization.name.length > 0,
  );
  // Validate role information - new owners get the "Owner" built-in role
  TestValidator.equals("role is owner", employee.role.name, "Owner");
  TestValidator.equals("role is builtin", employee.role.isBuiltin, true);
  TestValidator.predicate("role id is valid uuid", () => {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(employee.role.id);
  });
  // Validate status and employment type
  TestValidator.equals("status is active", employee.status, "active");
  TestValidator.equals(
    "employment type is full_time",
    employee.employment_type,
    "full_time",
  );
  // Validate department is null (no department assigned during initial setup)
  TestValidator.equals("department is null", employee.department, null);
  // Validate position is null (not assigned during initial setup)
  TestValidator.equals("position is null", employee.position, null);
  // Validate timestamps are valid ISO 8601 format
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(employee.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(employee.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deleted_at is null for active employee",
    employee.deleted_at,
    null,
  );
}
