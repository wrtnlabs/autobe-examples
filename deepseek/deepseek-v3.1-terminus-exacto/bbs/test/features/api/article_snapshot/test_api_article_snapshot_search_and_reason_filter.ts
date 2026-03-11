import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_snapshot_search_and_reason_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
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
  // 2. Create initial article
  const initialArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Initial Article Title with Specific Keywords",
          body: "This is the initial article content with searchable terms for testing.",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(initialArticle);
  // Note: In a real implementation, snapshots would be created automatically
  // when articles are modified. For this test, we assume the system automatically
  // creates snapshots with appropriate reasons when articles are created/edited.
  // 3. Test filtering by snapshot_reason with partial matching
  const editReasonFilter: IDiscussionBoardArticleSnapshot.IRequest = {
    snapshot_reason: "edit",
  };
  const editSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: initialArticle.id,
        body: editReasonFilter,
      },
    );
  typia.assert(editSnapshots);
  // Validate that returned snapshots match the filter criteria
  if (editSnapshots.data.length > 0) {
    TestValidator.predicate(
      "edit reason filter matches snapshot_reason field",
      editSnapshots.data.every(
        (snapshot) =>
          snapshot.snapshot_reason?.toLowerCase().includes("edit") ?? false,
      ),
    );
  }
  // 4. Test search functionality with title content
  const searchFilter: IDiscussionBoardArticleSnapshot.IRequest = {
    search: "Specific Keywords",
  };
  const searchResults =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: initialArticle.id,
        body: searchFilter,
      },
    );
  typia.assert(searchResults);
  // Validate search results contain the search term in title
  if (searchResults.data.length > 0) {
    TestValidator.predicate(
      "search returns relevant title matches",
      searchResults.data.some((snapshot) =>
        snapshot.title.toLowerCase().includes("specific keywords"),
      ),
    );
  }
  // 5. Test combination of reason filter and search
  const combinedFilter: IDiscussionBoardArticleSnapshot.IRequest = {
    snapshot_reason: "creation",
    search: "Initial",
  };
  const combinedResults =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: initialArticle.id,
        body: combinedFilter,
      },
    );
  typia.assert(combinedResults);
  // 6. Test empty results handling
  const nonExistentFilter: IDiscussionBoardArticleSnapshot.IRequest = {
    snapshot_reason: "non-existent-reason-12345",
  };
  const emptyResults =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: initialArticle.id,
        body: nonExistentFilter,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty results when filter matches nothing",
    emptyResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for empty results",
    emptyResults.pagination.records,
    0,
  );
  // 7. Test pagination with filters
  const paginatedFilter: IDiscussionBoardArticleSnapshot.IRequest = {
    search: "Article",
    page: 1,
    limit: 5,
  };
  const paginatedResults =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: initialArticle.id,
        body: paginatedFilter,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResults.data.length <= paginatedFilter.limit!,
  );
  // 8. Test chronological order is maintained
  if (paginatedResults.data.length > 1) {
    TestValidator.predicate(
      "results are in chronological order (newest first)",
      paginatedResults.data.every((snapshot, index) => {
        if (index === 0) return true;
        return (
          new Date(snapshot.created_at) <= new Date(paginatedResults.data[index - 1].created_at)
        );
      }),
    );
  }
}