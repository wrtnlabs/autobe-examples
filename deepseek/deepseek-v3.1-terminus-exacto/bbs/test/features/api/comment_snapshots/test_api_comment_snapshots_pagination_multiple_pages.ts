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

/**
 * Test comment snapshots pagination with multiple pages.
 * Creates 15 comment snapshots through multiple edits and validates pagination metadata
 * across different pages to ensure proper navigation and data retrieval.
 */
export async function test_api_comment_snapshots_pagination_multiple_pages(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000" satisfies string &
        tags.Format<"uri"> as string & tags.Format<"uri">,
      referrer: "http://localhost:3000" satisfies string &
        tags.Format<"uri"> as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create initial comment and generate version 1 snapshot
  const initialCommentBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.IUpdate;
  const comment = await api.functional.discussionBoard.admin.comments.update(
    adminConnection,
    {
      commentId: article.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      body: initialCommentBody,
    },
  );
  typia.assert(comment);
  // 4. Generate 14 more snapshots through comment edits (total 15 snapshots)
  const snapshotCount = 15;
  const commentEdits = ArrayUtil.repeat(snapshotCount - 1, (index) => ({
    content: `${RandomGenerator.paragraph({ sentences: 2 })} - Edit ${index + 2}`,
  }));
  for (const editBody of commentEdits) {
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: comment.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        body: editBody satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  }
  // 5. Test pagination on page 2 (limit=5)
  const page2 =
    await api.functional.discussionBoard.admin.comments.snapshots.index(
      adminConnection,
      {
        commentId: comment.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        body: {
          page: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  // 6. Validate pagination metadata for page 2
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals(
    "page 2 total records",
    page2.pagination.records,
    snapshotCount,
  );
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  TestValidator.equals("page 2 data count", page2.data.length, 5);
  // 7. Verify page 2 contains snapshots 6-10 (versions 6-10)
  TestValidator.predicate("page 2 has version 6-10", () => {
    const versions = page2.data.map((snapshot) => snapshot.version_number);
    return (
      versions.includes(6) &&
      versions.includes(7) &&
      versions.includes(8) &&
      versions.includes(9) &&
      versions.includes(10) &&
      versions.length === 5
    );
  });
  // 8. Test pagination on page 3 (edge case - last page)
  const page3 =
    await api.functional.discussionBoard.admin.comments.snapshots.index(
      adminConnection,
      {
        commentId: comment.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        body: {
          page: 3 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(page3);
  // 9. Validate pagination metadata for page 3
  TestValidator.equals("page 3 current page", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 5);
  TestValidator.equals(
    "page 3 total records",
    page3.pagination.records,
    snapshotCount,
  );
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 3);
  TestValidator.equals("page 3 data count", page3.data.length, 5);
  // 10. Verify page 3 contains remaining snapshots 11-15
  TestValidator.predicate("page 3 has version 11-15", () => {
    const versions = page3.data.map((snapshot) => snapshot.version_number);
    return (
      versions.includes(11) &&
      versions.includes(12) &&
      versions.includes(13) &&
      versions.includes(14) &&
      versions.includes(15) &&
      versions.length === 5
    );
  });
  // 11. Verify snapshots are sorted descending (newest first)
  const allVersions = [...page2.data, ...page3.data].map(
    (snapshot) => snapshot.version_number,
  );
  TestValidator.predicate("snapshots sorted descending", () => {
    for (let i = 0; i < allVersions.length - 1; i++) {
      if (allVersions[i] < allVersions[i + 1]) return false;
    }
    return true;
  });
}
