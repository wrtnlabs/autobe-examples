import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_department } from "../prepare/prepare_random_hrm_platform_department";

/**
 * Generate a random HRM platform department via the API for E2E testing.
 *
 * Creates a department within the specified organization using randomized data
 * from the prepare function. The department is immediately available for employee
 * assignment and appears in department lists. The organizationId parameter scopes
 * the department creation to a specific organization.
 *
 * All properties support test-time customization through the DeepPartial input
 * parameter, allowing tests to override specific fields while using random
 * defaults for others.
 *
 * @param connection - API connection information for the test
 * @param props - Generation options including optional body customization and required organizationId
 * @param props.body - Optional partial department creation data to override random defaults
 * @param props.params - URL parameters including the target organization ID
 * @param props.params.organizationId - Organization identifier scoping the department creation
 * @returns The newly created department entity with all fields including generated identifiers
 */
export async function generate_random_hrm_platform_member_organizations_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformDepartment.ICreate>;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmPlatformDepartment> {
  const prepared: IHrmPlatformDepartment.ICreate =
    prepare_random_hrm_platform_department(props.body);
  const result: IHrmPlatformDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      connection,
      {
        organizationId: props.params.organizationId,
        body: prepared,
      },
    );
  return result;
}
