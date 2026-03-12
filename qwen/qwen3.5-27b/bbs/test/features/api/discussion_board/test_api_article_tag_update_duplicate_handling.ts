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
 * Test that duplicate tag assignments are handled gracefully without errors.
 *
 * Scenario: A member attempts to add a tag that is already assigned to the article.
 * The system should handle the composite unique constraint violation gracefully
 * by ignoring the duplicate rather than throwing an error.
 */
export async function test_api_article_tag_update_duplicate_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator and create a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com/admin",
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section for Duplicate Tag Handling",
          description:
            "Section created for testing duplicate tag assignment handling",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 2. Authenticate as member and create an article with initial tags
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "1234";
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  const initialTagName = "news";
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        tags: [initialTagName],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Verify the article has the initial tag
  TestValidator.equals("article has initial tag", article.tags.length, 1);
  TestValidator.equals(
    "initial tag name matches",
    article.tags[0].name,
    initialTagName,
  );
  // 3. As the same authenticated member, attempt to add the same tag again
  // This should complete successfully without throwing an error
  const duplicateTagUpdateResponse =
    await api.functional.discussionBoard.articles.tags.updateTags(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tagsToAdd: [initialTagName],
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(duplicateTagUpdateResponse);
  // 4. Verify the request completed successfully without error
  // If we reached here, no error was thrown (not 409 Conflict, not 400, etc.)
  TestValidator.predicate("request completed without error", true);
  // 5. Verify the response is valid
  // The response is IDiscussionBoardArticleTag which represents a single tag assignment
  TestValidator.equals(
    "tag name in response matches",
    duplicateTagUpdateResponse.tag.name,
    initialTagName,
  );
  TestValidator.equals(
    "article id in response matches",
    duplicateTagUpdateResponse.article.id,
    article.id,
  );
  // 6. Test adding multiple duplicate tags at once
  // Add the same tag multiple times in a single request
  const multipleDuplicateResponse =
    await api.functional.discussionBoard.articles.tags.updateTags(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tagsToAdd: [initialTagName, initialTagName, initialTagName],
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(multipleDuplicateResponse);
  TestValidator.predicate(
    "multiple duplicate tags handled without error",
    true,
  );
  TestValidator.equals(
    "tag name still matches after multiple duplicates",
    multipleDuplicateResponse.tag.name,
    initialTagName,
  );
  // 7. Test adding a mix of new and duplicate tags
  const newTagName = "breaking";
  const mixedUpdateResponse =
    await api.functional.discussionBoard.articles.tags.updateTags(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tagsToAdd: [initialTagName, newTagName],
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(mixedUpdateResponse);
  TestValidator.predicate(
    "mixed duplicate and new tags handled without error",
    true,
  );
}
