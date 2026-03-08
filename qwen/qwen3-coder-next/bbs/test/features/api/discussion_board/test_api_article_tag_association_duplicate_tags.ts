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

/**
 * Test duplicate tag handling in article tag association.
 * 1. Member creates an article
 * 2. Member adds tags with duplicates (e.g., ["typescript", "javascript", "typescript", "web"])
 * 3. Verify system handles duplicates gracefully - tagsAdded equals unique tag count
 */
export async function test_api_article_tag_association_duplicate_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Create a test article
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Add tags with duplicates
  const duplicateTags = [
    "typescript",
    "javascript",
    "typescript",
    "web",
  ] satisfies (string & tags.MinLength<1>)[];
  const uniqueTagCount = new Set(duplicateTags).size;
  const addTagsResponse =
    await api.functional.discussionBoard.member.articles.tags.addTags(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: duplicateTags,
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(addTagsResponse);
  // 4. Verify system handled duplicates - tagsAdded should equal unique tag count
  TestValidator.equals(
    "tagsAdded equals unique count",
    addTagsResponse.tagsAdded,
    uniqueTagCount,
  );
}
