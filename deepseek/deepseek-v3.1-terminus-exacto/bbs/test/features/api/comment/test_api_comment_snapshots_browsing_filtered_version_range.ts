import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_comment_snapshots_browsing_filtered_version_range(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Create an article as administrator
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Note: Since the provided API functions don't include a direct comment creation endpoint,
  // we need to use the available update endpoint which should create the initial comment
  // and generate version 1 snapshot when called with a new comment ID
  // Create initial comment (version 1) using update endpoint with new UUID
  const initialComment =
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(initialComment);
  // Edit comment to create version 2
  const commentV2 = await api.functional.discussionBoard.admin.comments.update(
    adminConnection,
    {
      commentId: initialComment.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardComment.IUpdate,
    },
  );
  typia.assert(commentV2);
  // Edit comment again to create version 3
  const commentV3 = await api.functional.discussionBoard.admin.comments.update(
    adminConnection,
    {
      commentId: initialComment.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardComment.IUpdate,
    },
  );
  typia.assert(commentV3);
  // Browse snapshots with version range filter (2-3)
  const snapshots =
    await api.functional.discussionBoard.admin.comments.snapshots.index(
      adminConnection,
      {
        commentId: initialComment.id,
        body: {
          version_number_min: 2,
          version_number_max: 3,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate pagination and filtering
  TestValidator.equals(
    "should have exactly 2 snapshots",
    snapshots.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records count",
    snapshots.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages count", snapshots.pagination.pages, 1);
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  // Validate snapshot versions and order (descending by creation time)
  TestValidator.equals(
    "first snapshot version",
    snapshots.data[0].version_number,
    3,
  );
  TestValidator.equals(
    "second snapshot version",
    snapshots.data[1].version_number,
    2,
  );
  // Validate snapshot properties
  snapshots.data.forEach((snapshot, index) => {
    TestValidator.predicate(
      `snapshot ${index} has valid version`,
      snapshot.version_number === 2 || snapshot.version_number === 3,
    );
    TestValidator.predicate(
      `snapshot ${index} has author`,
      snapshot.author !== null && snapshot.author.id !== undefined,
    );
    TestValidator.predicate(
      `snapshot ${index} has creation timestamp`,
      snapshot.created_at !== null && snapshot.created_at !== undefined,
    );
  });
  // Verify version 1 is excluded
  TestValidator.predicate(
    "version 1 excluded",
    !snapshots.data.some((snapshot) => snapshot.version_number === 1),
  );
  // Validate descending order by creation time
  const firstTimestamp = new Date(snapshots.data[0].created_at).getTime();
  const secondTimestamp = new Date(snapshots.data[1].created_at).getTime();
  TestValidator.predicate(
    "snapshots in descending order",
    firstTimestamp >= secondTimestamp,
  );
}
