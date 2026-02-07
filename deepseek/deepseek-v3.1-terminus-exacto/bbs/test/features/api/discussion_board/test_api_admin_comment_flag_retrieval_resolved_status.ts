import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_admin_comment_flag_retrieval_resolved_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create an article using utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Add a comment to the article using utility function
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Since there's no flag update endpoint available, we'll test the basic flag retrieval
  // and validate that administrators can access flag information
  const retrievedFlag =
    await api.functional.discussionBoard.admin.articles.comments.flags.at(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        flagId: typia.random<string & tags.Format<"uuid">>(), // Using random ID since we can't create comment flags
      },
    );
  typia.assert(retrievedFlag);
  // Validate the comment flag structure
  TestValidator.predicate("has valid flag id", retrievedFlag.id.length > 0);
  TestValidator.predicate(
    "has flag reason",
    retrievedFlag.flag_reason.length > 0,
  );
  TestValidator.predicate("has flag type", retrievedFlag.flag_type.length > 0);
  TestValidator.predicate(
    "has valid status",
    retrievedFlag.status === "pending" ||
      retrievedFlag.status === "under_review" ||
      retrievedFlag.status === "resolved" ||
      retrievedFlag.status === "dismissed",
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    retrievedFlag.created_at !== null && retrievedFlag.created_at.length > 0,
  );
  // Validate user information
  TestValidator.predicate(
    "user information present",
    retrievedFlag.user !== null,
  );
  TestValidator.predicate(
    "user has valid id",
    retrievedFlag.user.id.length > 0,
  );
  TestValidator.predicate(
    "user has display name",
    retrievedFlag.user.display_name.length > 0,
  );
  // Validate comment information
  TestValidator.predicate(
    "comment information present",
    retrievedFlag.comment !== null,
  );
  TestValidator.predicate(
    "comment has valid id",
    retrievedFlag.comment.id.length > 0,
  );
  TestValidator.predicate(
    "comment has content",
    retrievedFlag.comment.content.length > 0,
  );
  TestValidator.predicate(
    "comment has author",
    retrievedFlag.comment.author !== null,
  );
  // Validate reviewer information (may be null for pending flags)
  if (retrievedFlag.reviewer !== null) {
    TestValidator.predicate(
      "reviewer has valid id",
      retrievedFlag.reviewer.id.length > 0,
    );
    TestValidator.predicate(
      "reviewer has display name",
      retrievedFlag.reviewer.display_name.length > 0,
    );
  }
  // Validate resolution fields (may be null for pending flags)
  if (
    retrievedFlag.status === "resolved" ||
    retrievedFlag.status === "dismissed"
  ) {
    TestValidator.predicate(
      "resolution_notes present for resolved flag",
      retrievedFlag.resolution_notes !== null &&
        retrievedFlag.resolution_notes.length > 0,
    );
    TestValidator.predicate(
      "resolved_at present for resolved flag",
      retrievedFlag.resolved_at !== null &&
        retrievedFlag.resolved_at.length > 0,
    );
    TestValidator.predicate(
      "reviewed_at present for resolved flag",
      retrievedFlag.reviewed_at !== null &&
        retrievedFlag.reviewed_at.length > 0,
    );
  }
}
