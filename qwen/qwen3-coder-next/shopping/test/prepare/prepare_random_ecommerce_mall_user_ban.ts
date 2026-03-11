import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_user_ban(
  input?: DeepPartial<IEcommerceMallUserBan.ICreate>,
): IEcommerceMallUserBan.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    user_type:
      input?.user_type ?? RandomGenerator.pick(["customer", "seller"] as const),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    unban_at: input?.unban_at ?? null,
  };
}
