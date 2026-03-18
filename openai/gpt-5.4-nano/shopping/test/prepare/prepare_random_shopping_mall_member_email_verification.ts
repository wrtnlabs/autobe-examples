import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_member_email_verification(
  input?: DeepPartial<IShoppingMallMemberEmailVerification.ICreate> | undefined,
): IShoppingMallMemberEmailVerification.ICreate {
  return {
    token: input?.token ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
