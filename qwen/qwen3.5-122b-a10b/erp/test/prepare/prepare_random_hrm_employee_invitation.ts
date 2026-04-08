import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM employee invitation creation data for E2E testing.
 *
 * Generates a complete IHrmEmployeeInvitation.ICreate with randomized values
 * for testing the employee invitation workflow. The function supports
 * partial input overrides for test customization while generating realistic
 * data for unspecified properties.
 *
 * @param input Optional partial input for test customization
 * @returns Complete IHrmEmployeeInvitation.ICreate instance
 */
export function prepare_random_hrm_employee_invitation(
  input?: DeepPartial<IHrmEmployeeInvitation.ICreate>,
): IHrmEmployeeInvitation.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    role_id: input?.role_id ?? typia.random<string & tags.Format<"uuid">>(),
    expires_at:
      input?.expires_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
