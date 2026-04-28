import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_role } from "../prepare/prepare_random_hrm_platform_role";

/**
 * Generate a random custom HRM platform role for E2E testing.
 *
 * Prepares random role creation data using the prepare function, then calls the creation
 * endpoint to create a new custom authorization template with specific permissions within an
 * organization. The role is scoped to the requesting user's organization
 * context. Permission keys are sampled from the platform's predefined capability
 * catalog including org:manage, employee:manage, employee:view, project:manage,
 * project:view, time:manage, time:approve, time:view_all, and report:view.
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
