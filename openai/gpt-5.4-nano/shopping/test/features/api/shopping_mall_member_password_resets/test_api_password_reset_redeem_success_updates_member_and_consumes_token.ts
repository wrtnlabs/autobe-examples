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

export async function test_api_password_reset_redeem_success_updates_member_and_consumes_token(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const oldPassword = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  // 1) Create member
  const member1 = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: oldPassword,
    },
  });
  typia.assert(member1);
  // 2) Redeem reset token (token is prepared by the generation utility)
  const newPassword = RandomGenerator.alphaNumeric(20);
  const redeem1 =
    await generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset(
      memberConnection,
      {
        body: {
          password: newPassword,
        },
      },
    );
  typia.assert(redeem1);
  const usedToken = redeem1.token;
  // 3) Verify member can log in with new password
  const memberConnectionAfter: api.IConnection = { host: connection.host };
  const loginWithNew = await authorize_member_login(memberConnectionAfter, {
    body: {
      email,
      password: newPassword,
    },
  });
  typia.assert(loginWithNew);
  // 4) Verify old password no longer works
  await TestValidator.error(
    "member login with old password should fail after redemption",
    async () => {
      const memberConnectionOld: api.IConnection = { host: connection.host };
      await authorize_member_login(memberConnectionOld, {
        body: {
          email,
          password: oldPassword,
        },
      });
    },
  );
  // 5) Verify token is consumed: second redeem attempt with same token fails
  await TestValidator.error(
    "redeem with the same reset token should fail after first redemption",
    async () => {
      const memberConnectionRedeemAgain: api.IConnection = {
        host: connection.host,
      };
      await generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset(
        memberConnectionRedeemAgain,
        {
          body: {
            token: usedToken,
            password: RandomGenerator.alphaNumeric(18),
          },
        },
      );
    },
  );
}
