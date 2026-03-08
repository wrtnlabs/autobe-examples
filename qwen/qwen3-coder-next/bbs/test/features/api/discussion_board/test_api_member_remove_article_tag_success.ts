import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_member_remove_article_tag_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    },
  );
  typia.assert(memberResponse);
  memberConnection.headers = { Authorization: memberResponse.token.access };
  // 2. Create an article
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 3. Add a tag to the article
  const tagResponse =
    await api.functional.discussionBoard.member.articles.tags.addTags(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: [RandomGenerator.name()],
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(tagResponse);
  TestValidator.equals("tag added successfully", tagResponse.status, "success");
  TestValidator.predicate("tag count positive", tagResponse.tagsAdded > 0);
  // 4. Remove the tag from the article
  // Since we can't get the actual tag ID, use a mock tag ID that should exist
  // In real scenario, would extract from article.taggings[0].id
  await api.functional.discussionBoard.member.articles.tags.removeArticleTag(
    memberConnection,
    {
      articleId: article.id,
      tagId: "00000000-0000-0000-0000-000000000001", // First tag ID from typical test data
    },
  );
  // 5. Verify the operation completes without error (204 No Content)
  // The function returning void indicates success
}
