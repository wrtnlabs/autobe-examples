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

export async function test_api_user_password_reset_list_expiring_soon(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication with actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  const auth: IEconomicPoliticalDiscussionBoardUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: "http://localhost",
        referrer: "http://localhost",
        ip: "127.0.0.1",
      } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
    });
  // 2. Calculate date range for 24-hour window
  const now: Date = new Date();
  const nowPlus24: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 3. Query password resets with proper date filters
  const passwordResets: IPageIEconomicPoliticalDiscussionBoardUserPasswordReset.ISummary =
    await api.functional.economicPoliticalDiscussionBoard.user.password_resets.index(
      userConnection,
      {
        body: {
          min_expires_at: now.toISOString(),
          max_expires_at: nowPlus24.toISOString(),
        } satisfies IEconomicPoliticalDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResets);
  // 4. Validate tokens are within date range
  TestValidator.predicate(
    "should have at least one token",
    passwordResets.data.length > 0,
  );
  for (const token of passwordResets.data) {
    const expiresAt: Date = new Date(token.expires_at);
    const isValid: boolean = expiresAt >= now && expiresAt <= nowPlus24;
    TestValidator.predicate(
      `Token ${token.id} should expire within window`,
      isValid,
    );
  }
}
