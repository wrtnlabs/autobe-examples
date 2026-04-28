import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random administrator promotion request of customer creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate
 * with randomized values. The actorType is randomly selected between 'customer'
 * and 'seller', and the reason field contains realistic multi-paragraph justification
 * text explaining the applicant's qualifications.
 *
 * When input overrides are provided via DeepPartial, they take precedence over
 * the random generation for the respective properties.
 */
export function prepare_random_ecommerce_platform_administrator_promotion_request_of_customer(
  input?: DeepPartial<IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate>,
): IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate {
  return {
    actorType:
      input?.actorType ??
      typia.random<string & tags.Pattern<"^(customer|seller)$">>(),
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 5,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
