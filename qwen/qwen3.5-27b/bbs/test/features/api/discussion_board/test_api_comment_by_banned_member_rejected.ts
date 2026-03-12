import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that a banned member cannot create comments on any article.
 * 1. Register and authenticate a member
 * 2. Register and authenticate an administrator
 * 3. Administrator creates a section
 * 4. Member creates an article in that section
 * 5. Attempt to post a comment on the article
 * Note: The ban functionality requires an admin API endpoint that is not available in the current SDK.
 * This test demonstrates the comment creation flow but cannot verify banned member rejection without a ban API.
 */
export async function test_api_comment_by_banned_member_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 3. Administrator creates a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 4. Member creates an article in that section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(article);
  // 5. Create a comment successfully (normal flow)
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Validate comment was created correctly
  TestValidator.equals(
    "comment article matches",
    comment.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment author matches",
    comment.author.id,
    memberAuth.id,
  );
  TestValidator.predicate("comment has content", comment.content.length > 0);
  // Note: To test banned member rejection, an admin API endpoint for banning members is required.
  // The current SDK does not provide a ban member endpoint.
  // Once such an endpoint is available, the test should:
  // - Ban the member using admin connection
  // - Attempt to create a new comment with memberConnection
  // - Verify the comment creation is rejected with TestValidator.error
}
