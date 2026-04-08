import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_organization } from "../prepare/prepare_random_hrm_platform_organization";

/**
 * Generate a random HRM platform organization via the API for E2E testing.
 *
 * Prepares random organization data using the prepare function, then calls the organization creation endpoint. The organization serves as the foundational container for all subsequent business entities including employees, projects, tasks, timelogs, timesheets, departments, and roles.
 *
 * Upon creation, the authenticated user is automatically assigned as the organization owner with full access privileges. All data within the organization is strictly isolated from other organizations on the platform.
 *
 * @param connection - The API connection configuration for making HTTP requests
 * @param props - Optional configuration object containing body data overrides
 * @param props.body - Partial organization creation data to override random defaults
 * @returns The newly created organization entity with all fields including generated UUID and timestamps
 */
export async function generate_random_hrm_platform_member_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformOrganization.ICreate>;
  },
): Promise<IHrmPlatformOrganization> {
  const prepared: IHrmPlatformOrganization.ICreate =
    prepare_random_hrm_platform_organization(props.body);
  const result: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.create(connection, {
      body: prepared,
    });
  return result;
}
