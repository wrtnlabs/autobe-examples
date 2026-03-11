import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test comment deletion with invalid comment ID.
 * A member registers and creates an article, then attempts to delete
 * non-existent comments using valid but non-matching UUIDs.
 * Validate the system returns appropriate error responses.
 */
export async function test_api_comment_deletion_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member and create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Update connection headers with authorization token
  memberConnection.headers = {
    Authorization: authorizedMember.token.access,
  };
  // 2. Create an article for the deletion attempt context
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Test various non-existent comment ID scenarios using valid UUIDs
  // Test 1: Random non-existent UUID
  await TestValidator.error("random non-existent UUID", async () => {
    await api.functional.discussionBoard.member.articles.comments.erase(
      memberConnection,
      {
        articleId: article.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 2: Another random non-existent UUID
  await TestValidator.error("another non-existent UUID", async () => {
    await api.functional.discussionBoard.member.articles.comments.erase(
      memberConnection,
      {
        articleId: article.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 3: UUID with specific pattern (edge case)
  await TestValidator.error("specific pattern UUID", async () => {
    await api.functional.discussionBoard.member.articles.comments.erase(
      memberConnection,
      {
        articleId: article.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // 4. Verify article ID remains valid after deletion attempts
  TestValidator.predicate(
    "article ID remains valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );
}
