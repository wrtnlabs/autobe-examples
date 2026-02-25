import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_comments_moderations_create } from "../../../generate/generate_random_discussion_board_admin_comments_moderations_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

export async function test_api_comment_snapshots_search_snapshot_reason_moderation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create article as context
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create initial comment and generate version 1 snapshot
  const commentData = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardComment.IUpdate;
  const initialComment =
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: commentData,
      },
    );
  typia.assert(initialComment);
  // Perform moderation action that creates moderation snapshot
  const moderation =
    await generate_random_discussion_board_admin_comments_moderations_create(
      adminConnection,
      {
        params: { commentId: initialComment.id },
        body: {
          action_type: "edit",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "completed",
          discussion_board_comment_id: initialComment.id,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation);
  // Admin edits comment creating edit snapshot
  const updatedComment =
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: initialComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Browse snapshots filtering by snapshot_reason='moderation'
  const snapshots =
    await api.functional.discussionBoard.admin.comments.snapshots.index(
      adminConnection,
      {
        commentId: initialComment.id,
        body: {
          snapshot_reason: "moderation",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate result includes exactly 1 snapshot with correct moderation reason
  TestValidator.equals(
    "should have exactly 1 moderation snapshot",
    snapshots.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot reason should be 'moderation'",
    snapshots.data[0].snapshot_reason,
    "moderation",
  );
}
