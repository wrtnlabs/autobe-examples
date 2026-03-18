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

export async function test_api_password_reset_redeem_rejects_ineligible_token_does_not_change_member_password(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register baseline member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password0 = typia.random<string & tags.Format<"password">>();
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: password0,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2) Baseline login should succeed with original password
  const baselineLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(baselineLoginConnection, {
    body: {
      email: memberAuthorized.email,
      password: password0,
    } satisfies IShoppingMallMember.ILogin,
  });
  // 3) Prepare an ineligible token (provided by seeded/fixture data in real tests)
  const ineligibleTokenValue = typia.random<string>();
  const password1 = typia.random<string & tags.Format<"password">>();
  // 4) Redemption must be rejected consistently
  await TestValidator.error(
    "redeem should reject ineligible reset token",
    async () => {
      await generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset(
        { host: connection.host },
        {
          body: {
            token: ineligibleTokenValue,
            password: password1,
          } satisfies IShoppingMallMemberPasswordReset.ICreate,
        },
      );
    },
  );
  await TestValidator.error(
    "redeem should reject ineligible reset token (repeat)",
    async () => {
      await generate_random_shopping_mall_member_member_password_resets_redeem_redeem_member_password_reset(
        { host: connection.host },
        {
          body: {
            token: ineligibleTokenValue,
            password: password1,
          } satisfies IShoppingMallMemberPasswordReset.ICreate,
        },
      );
    },
  );
  // 5) Password remains unchanged
  const loginAfterConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginAfterConnection, {
    body: {
      email: memberAuthorized.email,
      password: password0,
    } satisfies IShoppingMallMember.ILogin,
  });
  await TestValidator.error("login with new password should fail", async () => {
    const loginNewConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(loginNewConnection, {
      body: {
        email: memberAuthorized.email,
        password: password1,
      } satisfies IShoppingMallMember.ILogin,
    });
  });
}
