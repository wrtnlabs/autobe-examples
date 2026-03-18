import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_member_email_verification } from "../prepare/prepare_random_shopping_mall_member_email_verification";

export async function generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallMemberEmailVerification.ICreate>
      | undefined;
  },
): Promise<IShoppingMallMemberEmailVerification> {
  const prepared: IShoppingMallMemberEmailVerification.ICreate =
    prepare_random_shopping_mall_member_email_verification(props.body);
  return await api.functional.shoppingMall.member.member_email_verifications.redeem.redeemMemberEmailVerification(
    connection,
    {
      body: prepared,
    },
  );
}
