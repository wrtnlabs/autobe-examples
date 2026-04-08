import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform employee invitation creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformEmployeeInvitation.ICreate with randomized values for inviting employees to join an organization. The invitation includes email address, role assignment, optional department and position, employment type classification, and expiration timestamp.
 *
 * All required fields are generated with realistic test data. Optional fields (department_id, position) support null values and are properly handled with DeepPartial semantics.
 */
export function prepare_random_hrm_platform_employee_invitation(
  input?: DeepPartial<IHrmPlatformEmployeeInvitation.ICreate>,
): IHrmPlatformEmployeeInvitation.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    role_id: input?.role_id ?? typia.random<string & tags.Format<"uuid">>(),
    department_id:
      input?.department_id ??
      typia.random<string & tags.Format<"uuid">>() ??
      null,
    position: input?.position ?? RandomGenerator.name(2) ?? null,
    employment_type:
      input?.employment_type ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
    expires_at:
      input?.expires_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
