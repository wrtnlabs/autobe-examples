import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_department } from "../prepare/prepare_random_hrm_department";

/**
 * Generate a random HRM department via the API for E2E testing.
 *
 * Prepares random department data using the prepare function, then calls the creation endpoint to create a department within an organization.
 *
 * This function creates a department that can optionally be nested under a parent department to establish a two-level hierarchical structure. The department becomes immediately available for employee assignment and as a parent for other departments.
 *
 * @param connection - HTTP connection information for the API server
 * @param props - Generation parameters including optional body overrides and required organization context
 * @param props.body - Optional partial department creation data to override random generation
 * @param props.params - URL path parameters for the API endpoint
 * @param props.params.organizationId - Unique identifier of the organization that will own the department (UUID format)
 * @returns The created department record with all fields including system-generated id and timestamps
 */
export async function generate_random_hrm_member_organizations_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmDepartment.ICreate>;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmDepartment> {
  const prepared: IHrmDepartment.ICreate = prepare_random_hrm_department(
    props.body,
  );
  const result: IHrmDepartment =
    await api.functional.hrm.member.organizations.departments.create(
      connection,
      {
        organizationId: props.params.organizationId,
        body: prepared,
      },
    );
  return result;
}
