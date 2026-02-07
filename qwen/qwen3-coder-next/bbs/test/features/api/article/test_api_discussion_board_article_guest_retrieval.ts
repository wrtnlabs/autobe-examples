import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_article_guest_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestToken = await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(guestToken);
  // 2. Create a new connection with the guest token
  const guestAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${guestToken.token.access}`,
    },
  };
  // 3. Retrieve a non-existent article to test 404 response
  await TestValidator.error("non-existent article returns 404", async () => {
    await api.functional.discussionBoard.guest.articles.at(
      guestAuthenticatedConnection,
      {
        articleId: "00000000-0000-0000-0000-000000000000",
      },
    );
  });
  // 4. Retrieve an article successfully
  const article = await api.functional.discussionBoard.guest.articles.at(
    guestAuthenticatedConnection,
    {
      articleId: typia.random<string>(),
    },
  );
  typia.assert(article);
}
