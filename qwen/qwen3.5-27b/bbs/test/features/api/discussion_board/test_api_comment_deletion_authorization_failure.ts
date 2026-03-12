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
 * Test that a regular member cannot delete another member's comment.
 * This validates the authorization rule that only the comment author or administrators can delete comments.
 * 1. Administrator creates a section
 * 2. Member A creates an article in the section
 * 3. Member A creates a comment on the article
 * 4. Member B attempts to delete member A's comment
 * 5. Verify the request is rejected with authorization error
 */
export async function test_api_comment_deletion_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 2. Member A setup - create article
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberAConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 3. Member A creates a comment on their article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberAConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 4. Member B setup - different user
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 5. Member B attempts to delete member A's comment - should fail with authorization error
  await TestValidator.error(
    "member B cannot delete member A's comment",
    async () => {
      await api.functional.discussionBoard.administrator.articles.comments.erase(
        memberBConnection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    },
  );
}
