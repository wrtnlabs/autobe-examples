import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivityMetadatum";
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

export async function test_api_comment_activity_metadata_broken_relationship_chain(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create member account for article author
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // Create article
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment on article
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Update comment to generate comment activity with metadata
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Test case 1: Valid metadataId but invalid activityId
  await TestValidator.error(
    "should return 404 for invalid activityId",
    async () => {
      await api.functional.discussionBoard.admin.articles.comments.activities.metadata.at(
        adminConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          activityId: typia.random<string & tags.Format<"uuid">>(),
          metadataId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test case 2: Valid activityId but invalid commentId
  await TestValidator.error(
    "should return 404 for invalid commentId",
    async () => {
      await api.functional.discussionBoard.admin.articles.comments.activities.metadata.at(
        adminConnection,
        {
          articleId: article.id,
          commentId: typia.random<string & tags.Format<"uuid">>(),
          activityId: typia.random<string & tags.Format<"uuid">>(),
          metadataId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test case 3: Valid commentId but invalid articleId
  await TestValidator.error(
    "should return 404 for invalid articleId",
    async () => {
      await api.functional.discussionBoard.admin.articles.comments.activities.metadata.at(
        adminConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          commentId: comment.id,
          activityId: typia.random<string & tags.Format<"uuid">>(),
          metadataId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test case 4: Nonexistent metadataId
  await TestValidator.error(
    "should return 404 for nonexistent metadataId",
    async () => {
      await api.functional.discussionBoard.admin.articles.comments.activities.metadata.at(
        adminConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          activityId: typia.random<string & tags.Format<"uuid">>(),
          metadataId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
