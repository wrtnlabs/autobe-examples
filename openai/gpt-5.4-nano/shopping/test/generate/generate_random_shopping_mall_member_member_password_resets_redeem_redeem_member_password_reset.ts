import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_member_password_reset } from "../prepare/prepare_random_shopping_mall_member_password_reset";

export async function generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallMemberPasswordReset.ICreate> | undefined;
  },
): Promise<IShoppingMallMemberPasswordReset> {
  const prepared: IShoppingMallMemberPasswordReset.ICreate =
    prepare_random_shopping_mall_member_password_reset(props.body);
  return await api.functional.shoppingMall.member.member_password_resets.redeem.redeemMemberPasswordReset(
    connection,
    {
      body: prepared,
    },
  );
}
