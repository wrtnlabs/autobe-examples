import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_project } from "../prepare/prepare_random_hrm_platform_project";

/**
 * Generate a random HRM platform project via the API for E2E testing.
 *
 * Prepares random project data using the prepare function, then calls the project creation endpoint.
 * The project is automatically set to 'active' status upon creation with all required fields
 * populated including name and color code. Optional fields like description, budget hours, and
 * timeline dates are also randomized.
 *
 * Supports test-time customization through the optional body parameter, allowing specific
 * fields to be overridden while auto-generating the rest. The function returns the complete
 * created project entity including system-generated fields (id, organization, timestamps).
 *
 * @param connection - API connection information for the test server
 * @param props - Optional parameters for customization
 * @param props.body - Optional partial project creation data for test-time overrides
 * @returns The complete created IHrmPlatformProject entity with all fields populated
 */
export async function generate_random_hrm_platform_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformProject.ICreate>;
  },
): Promise<IHrmPlatformProject> {
  const prepared: IHrmPlatformProject.ICreate =
    prepare_random_hrm_platform_project(props.body);
  const result: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.create(connection, {
      body: prepared,
    });
  return result;
}
