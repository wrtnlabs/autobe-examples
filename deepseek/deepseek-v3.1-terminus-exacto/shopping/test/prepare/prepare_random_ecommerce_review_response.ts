import { IEcommerceReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_review_response(
  input?: DeepPartial<IEcommerceReviewResponse.ICreate>,
): IEcommerceReviewResponse.ICreate {
  return {
    body:
      input?.body ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
  };
}
