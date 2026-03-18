import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_member_password_reset(
  input?: DeepPartial<IShoppingMallMemberPasswordReset.ICreate> | undefined,
): IShoppingMallMemberPasswordReset.ICreate {
  return {
    token: input?.token ?? typia.random<string>(),
    password:
      input?.password ?? typia.random<string & tags.Format<"password">>(),
  };
}
