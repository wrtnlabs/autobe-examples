import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_user_ban(
  input?: DeepPartial<IEcommerceMallUserBan.ICreate> | undefined,
): IEcommerceMallUserBan.ICreate {
  const user_type =
    input?.user_type ??
    RandomGenerator.pick(["customer" as const, "seller" as const]);
  return {
    user_type: user_type,
    customer_id:
      user_type === "customer"
        ? (input?.customer_id ?? typia.random<string & tags.Format<"uuid">>())
        : undefined,
    seller_id:
      user_type === "seller"
        ? (input?.seller_id ?? typia.random<string & tags.Format<"uuid">>())
        : undefined,
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 5,
      }),
  };
}
