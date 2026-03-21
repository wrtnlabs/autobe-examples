import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_seller_approval(
  input?: DeepPartial<IEcommerceMallSellerApproval.ICreate>,
): IEcommerceMallSellerApproval.ICreate {
  const status =
    input?.status ?? RandomGenerator.pick(["approved", "rejected"] as const);
  return {
    sellerId: input?.sellerId ?? typia.random<string & tags.Format<"uuid">>(),
    status,
    rejectionReason:
      input?.rejectionReason ??
      (status === "rejected"
        ? RandomGenerator.paragraph({ sentences: 3 })
        : null),
  };
}
