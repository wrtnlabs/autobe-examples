import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_employee } from "../prepare/prepare_random_hrm_platform_employee";

/**
 * Generate a random employee to invite to the organization for E2E testing.
 *
 * This operation creates a workforce member linked to a global user account with role assignment,
 * organizational permissions, department grouping, position title, and employment classification.
 * Employees are assigned roles such as Owner, Manager, Employee, or custom roles within
 * the organization. The function prepares test data for employee invitation including member
 * identification, role assignment, optional department assignment, and employment type.
 *
 * The employee creation requires employee management permissions - only users with Owner or
 * Manager roles can create employee records. Organization context must be set before
 * performing this operation. Employment types include full-time, part-time, contractor,
 * or intern. Status defaults to active for new employee invites.
 */
export async function generate_random_hrm_platform_member_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformEmployee.ICreate> | undefined;
  },
): Promise<IHrmPlatformEmployee> {
  const prepared: IHrmPlatformEmployee.ICreate =
    prepare_random_hrm_platform_employee(props.body);
  const result: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.member.employees.create(connection, {
      body: prepared,
    });
  return result;
}
