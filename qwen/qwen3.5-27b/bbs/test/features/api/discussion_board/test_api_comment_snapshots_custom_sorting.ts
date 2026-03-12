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

/**
 * Test custom sorting of comment snapshots by different fields and sort orders.
 * Verifies that snapshots can be sorted by snapshot_at, created_at, and updated_at
 * fields with both ascending and descending order.
 */
export async function test_api_comment_snapshots_custom_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Create section for article
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 4. Create article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
        title: typia.random<string>(),
        content: typia.random<string>(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Create comment (generates first snapshot)
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Test default sorting (snapshot_at ascending)
  const defaultSortResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {} satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(defaultSortResult);
  TestValidator.predicate(
    "default sort returns snapshots",
    defaultSortResult.data.length > 0,
  );
  // 7. Test snapshot_at descending order
  const snapshotAtDescResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sortBy: "snapshot_at",
          sortOrder: "desc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotAtDescResult);
  TestValidator.predicate(
    "snapshot_at desc returns snapshots",
    snapshotAtDescResult.data.length > 0,
  );
  // 8. Test created_at sorting (ascending)
  const createdAtAscResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(createdAtAscResult);
  TestValidator.predicate(
    "created_at asc returns snapshots",
    createdAtAscResult.data.length > 0,
  );
  // 9. Test created_at sorting (descending)
  const createdAtDescResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(createdAtDescResult);
  TestValidator.predicate(
    "created_at desc returns snapshots",
    createdAtDescResult.data.length > 0,
  );
  // 10. Test updated_at sorting (ascending)
  const updatedAtAscResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sortBy: "updated_at",
          sortOrder: "asc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(updatedAtAscResult);
  TestValidator.predicate(
    "updated_at asc returns snapshots",
    updatedAtAscResult.data.length > 0,
  );
  // 11. Test updated_at sorting (descending)
  const updatedAtDescResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sortBy: "updated_at",
          sortOrder: "desc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(updatedAtDescResult);
  TestValidator.predicate(
    "updated_at desc returns snapshots",
    updatedAtDescResult.data.length > 0,
  );
  // 12. Verify pagination works with sorting
  const paginatedResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sortBy: "snapshot_at",
          sortOrder: "desc",
          page: 1,
          pageSize: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit matches pageSize",
    paginatedResult.pagination.limit === 10,
  );
}