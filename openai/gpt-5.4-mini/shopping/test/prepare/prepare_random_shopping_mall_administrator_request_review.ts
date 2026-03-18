import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_administrator_request_review(
  input?:
    | DeepPartial<IShoppingMallAdministratorRequestReview.ICreate>
    | undefined,
): IShoppingMallAdministratorRequestReview.ICreate {
  return {
    decision:
      input?.decision ?? RandomGenerator.pick(["approve", "reject"] as const),
    rejected_reason:
      input?.rejected_reason !== undefined
        ? input.rejected_reason
        : (input?.decision ?? "approve") === "reject"
          ? RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })
          : null,
  };
}
