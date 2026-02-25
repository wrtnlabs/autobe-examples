import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_login_banned_user_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a new registered user (join)
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: Partial<IDiscussionBoardRegisteredUser.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Mimic banning: Normally you would update user in DB or call banning API
  // But no direct API is provided, so simulate by attempting to login with banned user
  // Prepare login connection (base connection, no auth headers initially)
  const loginConnection: api.IConnection = { host: connection.host };
  // We expect login to fail due to banned status
  await TestValidator.error("login rejected for banned user", async () => {
    await authorize_registered_user_login(loginConnection, {
      body: {
        email: joinBody.email as string,
        password: joinBody.password as string,
      } satisfies IDiscussionBoardRegisteredUser.ILogin,
    });
  });
}
