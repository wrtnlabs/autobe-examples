import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import type { IEconomicPoliticalDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_password_reset_token_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Initialize password reset process (token generation)
  const tokenPage =
    await api.functional.economicPoliticalDiscussionBoard.user.password_resets.index(
      userConnection,
      {
        body: {
          user_id: userAuth.user.id,
        } satisfies IEconomicPoliticalDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  // Verify we got at least one token (the newly created one)
  if (tokenPage.data.length === 0) {
    throw new Error("Password reset token was not generated");
  }
  // Get the newly created token
  const newToken = tokenPage.data[0];
  // 3. Retrieve token details
  const tokenDetails =
    await api.functional.economicPoliticalDiscussionBoard.user.password_resets.at(
      userConnection,
      {
        resetId: newToken.id,
      },
    );
  // 4. Verify the token details
  typia.assert(tokenDetails);
  TestValidator.equals(
    "Token should be active (deleted_at=null)",
    tokenDetails.deleted_at,
    null,
  );
  TestValidator.equals(
    "Token should link to the correct user",
    tokenDetails.user.id,
    userAuth.user.id,
  );
}
