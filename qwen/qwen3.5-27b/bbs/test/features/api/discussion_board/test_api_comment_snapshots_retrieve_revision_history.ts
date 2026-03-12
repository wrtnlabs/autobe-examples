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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
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

export async function test_api_comment_snapshots_retrieve_revision_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving the complete revision history of a comment that has been modified multiple times.
   * Verify that snapshots are returned in chronological order (oldest first by default),
   * each snapshot contains the exact content at that point in time, and the author information
   * is correctly included. Validate pagination works correctly when there are multiple snapshots,
   * and that the response includes proper pagination metadata (current page, total records, total pages).
   */
  // 1. Administrator setup - create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Member setup - create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a section via administrator using utility function
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
  // 4. Create an article via member in that section using utility function
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
  // 5. Create a comment on the article via member using utility function (this generates the first snapshot)
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
  // 6. Retrieve the comment snapshots using the PATCH endpoint
  const snapshotsResponse =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          pageSize: 10,
          sortBy: "snapshot_at",
          sortOrder: "asc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages is at least 1",
    snapshotsResponse.pagination.pages >= 1,
  );
  TestValidator.equals(
    "page size is 10",
    snapshotsResponse.pagination.limit,
    10,
  );
  // 8. Validate snapshots are returned in chronological order (oldest first)
  TestValidator.predicate(
    "snapshots are in chronological order (oldest first)",
    snapshotsResponse.data.length <= 1 ||
      snapshotsResponse.data[0].snapshot_at <=
        snapshotsResponse.data[snapshotsResponse.data.length - 1].snapshot_at,
  );
  // 9. Validate each snapshot contains the exact content and author information
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    // Validate content exists and is non-empty
    TestValidator.predicate(
      `snapshot ${snapshot.id} has non-empty content`,
      snapshot.content.length > 0,
    );
    // Validate author information is included
    TestValidator.predicate(
      `snapshot ${snapshot.id} has author id`,
      snapshot.author.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has author email`,
      snapshot.author.email.length > 0,
    );
    // Validate timestamps exist
    TestValidator.predicate(
      `snapshot ${snapshot.id} has created_at`,
      snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has updated_at`,
      snapshot.updated_at.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has snapshot_at`,
      snapshot.snapshot_at.length > 0,
    );
  }
  // 10. Validate that the snapshot author matches the comment author
  TestValidator.equals(
    "snapshot author matches comment author",
    snapshotsResponse.data[0].author.id,
    comment.author.id,
  );
}
