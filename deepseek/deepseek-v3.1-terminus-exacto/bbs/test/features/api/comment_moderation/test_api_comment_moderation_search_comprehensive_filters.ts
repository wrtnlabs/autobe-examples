import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentModeration";
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
import { generate_random_discussion_board_admin_articles_comments_moderations_create } from "../../../generate/generate_random_discussion_board_admin_articles_comments_moderations_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

export async function test_api_comment_moderation_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple administrator connections
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Admin One",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Admin Two",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Create user connections
  const userConnection1: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: "User One",
      bio: "First test user",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const userConnection2: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: "User Two",
      bio: "Second test user",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create articles
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection1,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection2,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // Create comments
  const comment1 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection1,
      {
        params: { articleId: article1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection2,
      {
        params: { articleId: article1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection1,
      {
        params: { articleId: article2.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment3);
  // Perform moderation actions with different timestamps
  const moderation1 =
    await generate_random_discussion_board_admin_articles_comments_moderations_create(
      adminConnection1,
      {
        params: { articleId: article1.id, commentId: comment1.id },
        body: {
          action_type: "delete",
          reason: "Inappropriate content containing offensive language",
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation1);
  const moderation2 =
    await generate_random_discussion_board_admin_articles_comments_moderations_create(
      adminConnection2,
      {
        params: { articleId: article1.id, commentId: comment2.id },
        body: {
          action_type: "approve",
          reason: "Helpful and constructive feedback",
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation2);
  const moderation3 =
    await generate_random_discussion_board_admin_articles_comments_moderations_create(
      adminConnection1,
      {
        params: { articleId: article2.id, commentId: comment3.id },
        body: {
          action_type: "edit",
          reason: "Minor grammatical corrections needed",
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation3);
  // Test comprehensive filtering with multiple criteria
  const searchResults1 =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection1,
      {
        body: {
          action_type: "delete",
          reason: "offensive",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(searchResults1);
  // Validate filtering results
  TestValidator.equals(
    "should return only delete actions containing 'offensive'",
    searchResults1.data.length,
    1,
  );
  TestValidator.equals(
    "should match the specific moderation record",
    searchResults1.data[0].id,
    moderation1.id,
  );
  // Test pagination with filtered results
  const searchResults2 =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection1,
      {
        body: {
          action_type: "approve",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(searchResults2);
  TestValidator.equals(
    "should return approve actions only",
    searchResults2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination should show correct total records",
    searchResults2.pagination.records,
    1,
  );
  // Test date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const searchResults3 =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection1,
      {
        body: {
          created_at_from: yesterday,
          created_at_to: tomorrow,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(searchResults3);
  TestValidator.predicate(
    "should return moderations within date range",
    searchResults3.data.length >= 3,
  );
  // Test edge case: filtering by non-existent IDs
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const searchResults4 =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection1,
      {
        body: {
          admin_id: nonExistentId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(searchResults4);
  TestValidator.equals(
    "should return empty result for non-existent admin ID",
    searchResults4.data.length,
    0,
  );
  // Test combination of multiple filters using actual admin ID
  const searchResults5 =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection1,
      {
        body: {
          action_type: "edit",
          reason: "grammatical",
          admin_id: admin1.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(searchResults5);
  TestValidator.predicate(
    "should return records matching all criteria",
    searchResults5.data.length >= 1,
  );
}
