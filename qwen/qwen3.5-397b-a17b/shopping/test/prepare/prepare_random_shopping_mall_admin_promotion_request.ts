import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall admin promotion request creation data for E2E testing.
 *
 * Generates a complete IShoppingMallAdminPromotionRequest.ICreate with randomized
 * reason text. The reason field contains a multi-sentence explanation simulating
 * an applicant's justification for seeking administrator privileges.
 *
 * This function supports test customization through the optional input parameter.
 * When specific reason text is needed for test scenarios, provide it via the
 * input parameter's reason property.
 *
 * @param input - Optional partial input for test customization
 * @returns Complete IShoppingMallAdminPromotionRequest.ICreate instance
 */
export function prepare_random_shopping_mall_admin_promotion_request(
  input?: DeepPartial<IShoppingMallAdminPromotionRequest.ICreate>,
): IShoppingMallAdminPromotionRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
