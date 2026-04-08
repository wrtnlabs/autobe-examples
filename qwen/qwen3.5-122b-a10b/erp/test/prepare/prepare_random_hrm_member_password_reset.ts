import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM member password reset request data for E2E testing.
 *
 * Generates a complete IHrmMemberPasswordReset.ICreate with randomized email value.
 * The email field serves as the primary identifier for password reset requests.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete IHrmMemberPasswordReset.ICreate object
 */
export function prepare_random_hrm_member_password_reset(
  input?: DeepPartial<IHrmMemberPasswordReset.ICreate>,
): IHrmMemberPasswordReset.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
  };
}
