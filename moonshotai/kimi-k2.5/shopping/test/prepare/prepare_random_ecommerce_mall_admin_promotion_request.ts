import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_admin_promotion_request(
  input?: DeepPartial<IEcommerceMallAdminPromotionRequest.ICreate>,
): IEcommerceMallAdminPromotionRequest.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
