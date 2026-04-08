import { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random administrator grade change record for E2E testing.
 *
 * Generates a complete IEcommerceMallAdministratorGrade.ICreate with randomized values
 * for testing administrator promotion and demotion workflows. The grade can be either
 * "regular" or "super", and an optional reason string is generated to document the
 * business justification for the grade change.
 *
 * All three fields (administrator_id, grade, reason) are test-customizable through the
 * input parameter, allowing partial overrides for specific test scenarios while
 * maintaining realistic default values for unprovided fields.
 */
export function prepare_random_ecommerce_mall_administrator_grade(
  input?: DeepPartial<IEcommerceMallAdministratorGrade.ICreate> | undefined,
): IEcommerceMallAdministratorGrade.ICreate {
  return {
    administrator_id:
      input?.administrator_id ?? typia.random<string & tags.Format<"uuid">>(),
    grade: input?.grade ?? RandomGenerator.pick(["regular", "super"] as const),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
  };
}
