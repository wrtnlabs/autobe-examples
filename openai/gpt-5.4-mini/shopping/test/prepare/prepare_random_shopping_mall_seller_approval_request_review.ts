import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApprovalRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_approval_request_review(
  input?:
    | DeepPartial<IShoppingMallSellerApprovalRequestReview.ICreate>
    | undefined,
): IShoppingMallSellerApprovalRequestReview.ICreate {
  return {
    decision:
      input?.decision ??
      RandomGenerator.pick(["approved", "rejected"] as const),
    rejectionReason: input?.rejectionReason ?? null,
  };
}
