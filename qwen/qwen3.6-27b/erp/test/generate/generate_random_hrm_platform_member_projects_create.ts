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
 * Prepares random project data including name, color code, optional description,
 * budget, and date range using the prepare function, then calls the creation
 * endpoint. The project is created within the authenticated member's active
 * organization context and immediately enters active status, ready for task
 * creation and time tracking.
 */
export async function generate_random_hrm_platform_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformProject.ICreate> | undefined;
  },
): Promise<IHrmPlatformProject> {
  const prepared: IHrmPlatformProject.ICreate =
    prepare_random_hrm_platform_project(props.body);
  return await api.functional.hrmPlatform.member.projects.create(connection, {
    body: prepared,
  });
}
