import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_role } from "../prepare/prepare_random_hrm_platform_role";

/**
 * Generate a random HRM platform role via the API for E2E testing.
 *
 * Prepares random role creation data using the prepare function, then calls the
 * role creation endpoint to create a custom role within an organization. The
 * generated role includes a valid organization reference, unique role name,
 * optional description, and random permission assignments.
 *
 * This function is designed for testing role creation workflows, permission
 * management, and organization role administration. The role is automatically
 * marked as a custom role (is_built_in: false) by the API.
 *
 * @param connection - API connection information for the test server
 * @param props - Optional customization parameters for role generation
 * @param props.body - Optional partial role creation data to override defaults
 * @returns Promise resolving to the created role with full metadata
 */
export async function generate_random_hrm_platform_member_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformRole.ICreate> | undefined;
  },
): Promise<IHrmPlatformRole> {
  const prepared: IHrmPlatformRole.ICreate = prepare_random_hrm_platform_role(
    props.body,
  );
  const result: IHrmPlatformRole =
    await api.functional.hrmPlatform.member.roles.create(connection, {
      body: prepared,
    });
  return result;
}
