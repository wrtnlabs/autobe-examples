import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random seller suspension data for E2E testing.
 *
 * Generates a complete IEcommerceMallSellerSuspension.ICreate with randomized
 * suspension reason. The reason field must be non-empty and is used for the
 * immutable audit trail when suspending a seller account.
 *
 * **Test-customizable fields:**
 * - reason: Non-empty text explaining the suspension cause
 *
 * @param input - Optional DeepPartial override for any field
 * @returns Complete ICreate object with random suspension data
 */
export function prepare_random_ecommerce_mall_seller_suspension(
  input?: DeepPartial<IEcommerceMallSellerSuspension.ICreate>,
): IEcommerceMallSellerSuspension.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
