import { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_seller_approval_response(
  input?: DeepPartial<IEcommerceSellerApprovalResponse.ICreate>,
): IEcommerceSellerApprovalResponse.ICreate {
  const decision =
    input?.decision ?? RandomGenerator.pick(["approved", "rejected"] as const);
  return {
    seller_approval_queue_id:
      input?.seller_approval_queue_id ??
      typia.random<string & tags.Format<"uuid">>(),
    decision: decision,
    reason:
      input?.reason ??
      (decision === "rejected"
        ? RandomGenerator.paragraph({ sentences: 2 })
        : null),
  };
}
