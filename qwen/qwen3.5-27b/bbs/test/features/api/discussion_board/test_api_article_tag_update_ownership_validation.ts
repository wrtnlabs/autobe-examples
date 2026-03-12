import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that only the article owner can update tags on their article.
 *
 * This test validates the ownership restriction on tag update operations:
 * 1. Administrator creates a section
 * 2. Member A creates an article with tags in that section
 * 3. Member B (different user) attempts to update tags on Member A's article
 * 4. The request is rejected with 403 Forbidden due to ownership violation
 */
export async function test_api_article_tag_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a section for article assignment
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Member A setup (article owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 4. Create an article owned by member A with initial tags
  const article = await generate_random_discussion_board_member_articles_create(
    memberAConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        tags: ["tag1", "tag2"],
      },
    },
  );
  typia.assert(article);
  // Store initial tags for the update attempt
  const initialTags = article.tags.map((t) => t.name);
  // 5. Member B setup (different user, not the owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Attempt to update tags as member B (should fail with 403)
  await TestValidator.error(
    "non-owner cannot update article tags",
    async () => {
      await api.functional.discussionBoard.articles.tags.updateTags(
        memberBConnection,
        {
          articleId: article.id,
          body: {
            tagsToAdd: ["tag3"],
            tagsToRemove: [initialTags[0]],
          } satisfies IDiscussionBoardArticleTag.IUpdate,
        },
      );
    },
  );
}
