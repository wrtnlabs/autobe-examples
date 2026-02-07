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

export async function test_api_discussion_board_article_guest_with_attachments(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await api.functional.discussionBoard.auth.guest.join(
    guestConnection,
    {
      body: typia.random<IDiscussionBoardGuest.IJoin>(),
    },
  );
  typia.assert(guestAuth);
  // Get article with attachments
  const article = await api.functional.discussionBoard.guest.articles.at(
    guestConnection,
    {
      articleId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(article);
}
