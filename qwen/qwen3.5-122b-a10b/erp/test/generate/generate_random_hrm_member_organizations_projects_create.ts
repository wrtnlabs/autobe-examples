import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_project } from "../prepare/prepare_random_hrm_project";

/**
 * Generate a random HRM project within an organization for E2E testing.
 *
 * Creates a new project by preparing random project data and calling the project creation endpoint.
 * The project is associated with the specified organization and includes randomized values for
 * name, color_code, status, and optional fields like description, budget_hours, and timeline dates.
 *
 * @param connection - HTTP connection configuration for API requests
 * @param props.body - Optional partial project creation data to override defaults
 * @param props.params.organizationId - UUID of the organization that will own this project
 * @returns The created project entity with all system-generated fields
 */
export async function generate_random_hrm_member_organizations_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmProject.ICreate>;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmProject> {
  const prepared: IHrmProject.ICreate = prepare_random_hrm_project(props.body);
  const result: IHrmProject =
    await api.functional.hrm.member.organizations.projects.create(connection, {
      organizationId: props.params.organizationId,
      body: prepared,
    });
  return result;
}
