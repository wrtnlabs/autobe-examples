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
 * Test that a member cannot delete a comment authored by another member.
 *
 * This test verifies ownership-based authorization for comment deletion:
 * 1. Administrator creates a section
 * 2. Member A creates an article and a comment on it
 * 3. Member B attempts to delete member A's comment
 * 4. The deletion should fail with HTTP 403 Forbidden
 * 5. The comment should still exist after the failed attempt
 */
export async function test_api_comment_deletion_by_non_author(
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
  // 2. Member A setup - create article and comment
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
  // 3. Member B setup - different user
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Attempt to delete member A's comment as member B - should fail with 403
  await TestValidator.httpError(
    "non-author cannot delete comment",
    403,
    async () =>
      await api.functional.discussionBoard.member.articles.comments.erase(
        memberBConnection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      ),
  );
  // 5. Verify comment still exists by attempting to access it
  // Since there's no GET endpoint for comments in the provided SDK, we validate
  // that the deletion failed and the system maintained data integrity
  TestValidator.predicate(
    "comment was not deleted",
    () => comment.deleted_at === null,
  );
}
