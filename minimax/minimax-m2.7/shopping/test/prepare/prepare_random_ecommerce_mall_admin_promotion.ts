import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random admin promotion creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallAdminPromotion.ICreate with randomized values.
 * The reason field documents the rationale behind promoting a regular administrator
 * to super administrator status. Can be null if no reason is provided.
 *
 * @param input - Optional partial data to override generated values
 * @returns Complete promotion request data
 */
export function prepare_random_ecommerce_mall_admin_promotion(
  input?: DeepPartial<IEcommerceMallAdminPromotion.ICreate>,
): IEcommerceMallAdminPromotion.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
