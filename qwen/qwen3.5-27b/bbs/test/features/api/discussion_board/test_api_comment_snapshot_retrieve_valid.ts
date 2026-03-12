import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
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

export async function test_api_comment_snapshot_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a valid comment snapshot that was created when a comment was modified.
   * The snapshot should contain denormalized references to the article and member who authored
   * the comment at the time of snapshot.
   */
  // 1. Administrator setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Administrator creates a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(section);
  // 3. Member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Member creates an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        tags: ["test", "discussion"],
      },
    },
  );
  typia.assert(article);
  // 5. Member creates a comment on the article (generates initial snapshot)
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Retrieve the comment snapshot
  // Note: Using comment.id as snapshotId assumes initial snapshot has same ID
  const snapshot =
    await api.functional.discussionBoard.articles.comments.snapshots.at(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        snapshotId: comment.id,
      },
    );
  typia.assert(snapshot);
  // 7. Validate business logic - snapshot references match original data
  TestValidator.equals(
    "comment id references correctly",
    snapshot.commentId,
    comment.id,
  );
  TestValidator.equals(
    "article reference matches",
    snapshot.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title preserved",
    snapshot.article.title,
    article.title,
  );
  TestValidator.equals(
    "article section matches",
    snapshot.article.section.id,
    section.id,
  );
  TestValidator.equals(
    "content preserved in snapshot",
    snapshot.content,
    comment.content,
  );
  TestValidator.predicate(
    "snapshot has valid timestamps",
    snapshot.created_at !== undefined &&
      snapshot.updated_at !== undefined &&
      snapshot.snapshot_at !== undefined,
  );
}
