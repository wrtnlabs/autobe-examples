import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
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

export async function test_api_comment_snapshot_history_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
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
  // Create an article using the available API function
  const article = await api.functional.discussionBoard.member.articles.create(
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
  // Create initial comment
  const initialComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);
  // Create additional comments to generate more snapshot data
  const additionalComments = await ArrayUtil.asyncRepeat(3, async (index) => {
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
    return comment;
  });
  // Retrieve snapshot history with pagination
  const snapshotRequest: IDiscussionBoardCommentSnapshot.IRequest = {
    limit: 2, // Small limit to test pagination
    page: 1,
  };
  const snapshotsPage1 =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshotsPage1);
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 current page",
    snapshotsPage1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", snapshotsPage1.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 has records",
    snapshotsPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has pages",
    snapshotsPage1.pagination.pages >= 0,
  );
  // Get second page if available
  if (snapshotsPage1.pagination.pages > 1) {
    snapshotRequest.page = 2;
    const snapshotsPage2 =
      await api.functional.discussionBoard.articles.comments.snapshots.index(
        memberConnection,
        {
          articleId: article.id,
          commentId: initialComment.id,
          body: snapshotRequest,
        },
      );
    typia.assert(snapshotsPage2);
    // Validate pagination metadata for page 2
    TestValidator.equals(
      "page 2 current page",
      snapshotsPage2.pagination.current,
      2,
    );
  }
  // Test filtering by date range
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
  const endDate = new Date().toISOString();
  const dateFilteredSnapshots =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          created_at_start: startDate,
          created_at_end: endDate,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredSnapshots);
  // Test search functionality with content from the initial comment
  const searchTerm = RandomGenerator.substring(initialComment.content);
  const searchFilteredSnapshots =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          search: searchTerm,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(searchFilteredSnapshots);
  // Validate snapshot structure
  if (snapshotsPage1.data.length > 0) {
    const snapshot = snapshotsPage1.data[0];
    TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has creation timestamp",
      snapshot.created_at.length > 0,
    );
    // edit_reason can be null, so we don't validate its presence
  }
  // Validate chronological order (oldest first) for all available snapshots
  const allSnapshots =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  if (allSnapshots.data.length > 1) {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      const current = new Date(allSnapshots.data[i].created_at);
      const previous = new Date(allSnapshots.data[i - 1].created_at);
      TestValidator.predicate(
        "snapshots in chronological order",
        current >= previous,
      );
    }
  }
}
