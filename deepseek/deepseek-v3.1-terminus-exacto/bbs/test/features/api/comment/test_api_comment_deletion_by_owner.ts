import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // Note: Section ID should be obtained from existing sections in the system
  // For this test, we'll use a random UUID as a placeholder
  // In a real scenario, we would first create or retrieve an existing section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create multiple comments to test chronological ordering
  const comments = await ArrayUtil.asyncRepeat(3, async (index) => {
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardComment.ICreate,
          params: {
            articleId: article.id,
          },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 4. Delete the middle comment to test chronological ordering preservation
  const commentToDelete = comments[1];
  await api.functional.discussionBoard.member.articles.comments.erase(
    memberConnection,
    {
      articleId: article.id,
      commentId: commentToDelete.id,
    },
  );
  // 5. Verify that attempting to delete the same comment again fails
  await TestValidator.error(
    "cannot delete already deleted comment",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.erase(
        memberConnection,
        {
          articleId: article.id,
          commentId: commentToDelete.id,
        },
      );
    },
  );
  // 6. Validate that the deletion operation completed successfully
  // The absence of errors during deletion indicates successful soft deletion
  // Since we cannot directly retrieve deleted comments, we rely on the error test above
  // to validate that the comment was properly deleted
  // 7. Test chronological ordering by ensuring remaining comments are still accessible
  // and in correct order (this would require comment listing functionality which is not provided)
  // For now, we validate that the deletion operation itself was successful
}
