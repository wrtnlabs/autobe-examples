import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_role } from "../prepare/prepare_random_hrm_platform_role";

/**
 * Generate a random custom role within the organization via the API for E2E testing.
 *
 * Prepares random role creation data using the prepare function, then calls the
 * role creation endpoint. This creates a custom employee role with randomized
 * name and description that can be used for permission and access control testing.
 * The role is immediately available for assignment to employees after creation.
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
