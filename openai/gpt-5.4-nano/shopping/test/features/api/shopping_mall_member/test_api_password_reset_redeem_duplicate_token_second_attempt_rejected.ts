import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset } from "../../../generate/generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset";
import { prepare_random_shopping_mall_member_password_reset } from "../../../prepare/prepare_random_shopping_mall_member_password_reset";

export async function test_api_password_reset_redeem_duplicate_token_second_attempt_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: initialPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2) Obtain a valid reset token by redeeming once through the generator.
  //    The generator returns the reset token payload { token, password: boolean }.
  const resetRedeemConnectionA: api.IConnection = { host: connection.host };
  const newPasswordA = typia.random<string & tags.Format<"password">>();
  const resetPayload =
    await generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset(
      resetRedeemConnectionA,
      {
        body: {
          password: newPasswordA,
        },
      },
    );
  typia.assert(resetPayload);
  const token = resetPayload.token;
  // 3) Attempt A (already redeemed) vs Attempt B (second redemption with same token)
  //    We simulate the edge by performing the second redemption right after.
  const resetRedeemConnectionB: api.IConnection = { host: connection.host };
  const newPasswordB = typia.random<string & tags.Format<"password">>();
  const attemptB = await TestValidator.error(
    "second redemption attempt with the same reset token should be rejected",
    async () => {
      await generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset(
        resetRedeemConnectionB,
        {
          body: {
            token,
            password: newPasswordB,
          } satisfies IShoppingMallMemberPasswordReset.ICreate,
        },
      );
    },
  );
  void attemptB;
  // 4) Any further redemption attempt must also be rejected
  const resetRedeemConnectionC: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "third redemption attempt with the same reset token should be rejected",
    async () => {
      await generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset(
        resetRedeemConnectionC,
        {
          body: {
            token,
            password: typia.random<string & tags.Format<"password">>(),
          } satisfies IShoppingMallMemberPasswordReset.ICreate,
        },
      );
    },
  );
  // Note: Direct verification of reset record used_at and final login credential
  // is not possible with the provided DTOs/SDK surface in this test scope.
}
