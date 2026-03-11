import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentDeletion";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_deletion_admin_update_audit_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create admin connection and account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Note: Section creation is not available in the provided APIs.
  // Since we cannot create sections, we need to use a different approach.
  // For this test, we'll assume there's at least one existing section.
  // In a real scenario, we would need to create a section first.
  // Member creates an article - using a placeholder section ID
  // This will fail if no sections exist, but we have no API to create sections
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Member adds a comment to the article
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
  // Member deletes their own comment (creates initial deletion record)
  // No utility function exists for comment deletion, so using SDK directly
  await api.functional.discussionBoard.member.articles.comments.erase(
    memberConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  // Admin updates deletion reason for the first time
  const firstUpdate =
    await api.functional.discussionBoard.admin.articles.comments.deletions.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: "Initial deletion reason" as string,
        } satisfies IDiscussionBoardCommentDeletion.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Store immutable fields from first update
  const originalActorType = firstUpdate.actor_type;
  const originalCreatedAt = firstUpdate.created_at;
  const originalCommentId = firstUpdate.discussion_board_comment_id;
  // Admin updates deletion reason for the second time
  const secondUpdate =
    await api.functional.discussionBoard.admin.articles.comments.deletions.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: "Updated deletion reason" as string,
        } satisfies IDiscussionBoardCommentDeletion.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // Validate audit trail integrity
  TestValidator.equals(
    "actor type remains unchanged",
    secondUpdate.actor_type,
    originalActorType,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    secondUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "comment reference remains unchanged",
    secondUpdate.discussion_board_comment_id,
    originalCommentId,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    secondUpdate.updated_at,
    firstUpdate.updated_at,
  );
  TestValidator.notEquals(
    "reason field should change",
    secondUpdate.reason,
    firstUpdate.reason,
  );
  // Admin updates deletion reason for the third time (with null reason)
  const thirdUpdate =
    await api.functional.discussionBoard.admin.articles.comments.deletions.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: null,
        } satisfies IDiscussionBoardCommentDeletion.IUpdate,
      },
    );
  typia.assert(thirdUpdate);
  // Final validation of audit trail integrity
  TestValidator.equals(
    "actor type remains unchanged after third update",
    thirdUpdate.actor_type,
    originalActorType,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged after third update",
    thirdUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "comment reference remains unchanged after third update",
    thirdUpdate.discussion_board_comment_id,
    originalCommentId,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after third update",
    thirdUpdate.updated_at,
    secondUpdate.updated_at,
  );
  TestValidator.equals("reason field should be null", thirdUpdate.reason, null);
}
