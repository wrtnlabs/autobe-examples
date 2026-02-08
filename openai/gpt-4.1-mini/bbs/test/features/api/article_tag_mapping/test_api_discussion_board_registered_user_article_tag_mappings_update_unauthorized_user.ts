import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_tag_mappings_update_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests that an unauthorized registered user who is not the article author cannot update the tag mappings of another user's article. It verifies proper authorization enforcement that only article authors or administrators can perform updates. The scenario includes two user registrations, article creation by the first user, and an attempt by the second user to update the tags, expecting a forbidden or unauthorized error response.
  // Step 1: Register article author user and create new connection for them
  const authorJoinConnection: api.IConnection = { host: connection.host };
  const authorAuthorized = await authorize_registered_user_join(
    authorJoinConnection,
    { body: {} },
  );
  typia.assert(authorAuthorized);
  authorJoinConnection.headers = {
    Authorization: `Bearer ${authorAuthorized.token.access}`,
  };
  // Step 2: Using author, create an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      authorJoinConnection,
      { body: {} },
    );
  typia.assert(article);
  // Step 3: Register a different user (not the author)
  const otherUserJoinConnection: api.IConnection = { host: connection.host };
  const otherUserAuthorized = await authorize_registered_user_join(
    otherUserJoinConnection,
    { body: {} },
  );
  typia.assert(otherUserAuthorized);
  otherUserJoinConnection.headers = {
    Authorization: `Bearer ${otherUserAuthorized.token.access}`,
  };
  // Step 4: The other user attempts to update tag mappings of the author's article
  const newTagMappingsPatch: IDiscussionBoardArticleTagMapping.IPatch = {
    tag_ids: [],
  };
  await TestValidator.httpError(
    "unauthorized user cannot update tag mappings",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.updateTagMappings(
        otherUserJoinConnection,
        {
          articleId: (article as IEntity).id,
          body: newTagMappingsPatch,
        },
      );
    },
  );
}
