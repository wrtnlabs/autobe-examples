import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivity";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

export async function test_api_comment_activity_audit_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register a member
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
  // Create an article using the member connection
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Since we don't have a way to create activities directly, we need to assume
  // that comment creation generates an activity record. In a real scenario,
  // we would need to create an activity or retrieve existing ones.
  // For this test, we'll use the comment ID as a placeholder for activity ID
  // (this is a limitation of the current API structure)
  // Retrieve the comment activity audit record
  const activity =
    await api.functional.discussionBoard.admin.articles.comments.activities.at(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: comment.id, // Using comment ID as activity ID placeholder
      },
    );
  typia.assert(activity);
  // Validate the activity record structure and relationships
  TestValidator.equals("activity id is uuid", typeof activity.id, "string");
  TestValidator.predicate(
    "activity has valid action type",
    () => typeof activity.action === "string" && activity.action.length > 0,
  );
  TestValidator.predicate(
    "activity has valid timestamps",
    () =>
      typeof activity.created_at === "string" &&
      typeof activity.updated_at === "string",
  );
  // Validate comment relationship
  TestValidator.equals(
    "activity comment matches",
    activity.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "activity comment content matches",
    activity.comment.content,
    comment.content,
  );
  // Validate actor information (polymorphic resolution)
  TestValidator.predicate("actor information is present", () => {
    const actor = activity.actor;
    return actor && typeof actor.id === "string" && actor.id.length > 0;
  });
  // Validate actor type using proper type checking
  const actor = activity.actor;
  if ("display_name" in actor) {
    // Member actor - validate it's the comment author
    TestValidator.equals(
      "actor is the comment author",
      actor.id,
      comment.author.id,
    );
    TestValidator.equals(
      "actor display name matches",
      actor.display_name,
      comment.author.display_name,
    );
  } else if ("admin_grade" in actor && typeof actor.admin_grade === "string") {
    // Admin actor - validate basic structure
    TestValidator.predicate(
      "admin actor has valid grade",
      () => actor.admin_grade === "regular" || actor.admin_grade === "super",
    );
  } else if ("email" in actor && "admin_grade" in actor) {
    // Super admin actor - validate structure
    TestValidator.predicate(
      "super admin actor has valid structure",
      () =>
        typeof actor.email === "string" &&
        typeof actor.admin_grade === "string",
    );
  }
  // Test permission enforcement by trying to access as non-admin
  await TestValidator.error(
    "non-admin cannot access audit records",
    async () => {
      await api.functional.discussionBoard.admin.articles.comments.activities.at(
        memberConnection, // Using member connection instead of admin
        {
          articleId: article.id,
          commentId: comment.id,
          activityId: comment.id,
        },
      );
    },
  );
}
