import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_article_search_admin_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 2: Search articles with comprehensive filters
  const searchResult = await api.functional.discussionBoard.articles.index(
    adminConnection,
    {
      body: {
        q: "tax reform", // Search query
        sectionId: undefined, // Optional: filter by specific section
        tag: "fiscal-policy", // Filter by tag
        sortBy: "oldest", // Sort by oldest first
        page: 1, // First page
        limit: 20, // 20 items per page
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  // Step 3: Validate search results structure
  typia.assert(searchResult);
  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "has positive page number",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has positive limit",
    searchResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "has non-negative total records",
    searchResult.pagination.records >= 0,
  );
  // Step 5: Validate articles structure
  TestValidator.predicate(
    "has articles array",
    Array.isArray(searchResult.data),
  );
  // Step 6: Validate individual article structure if any articles exist
  if (searchResult.data.length > 0) {
    const firstArticle = searchResult.data[0];
    TestValidator.predicate(
      "article has valid ID",
      /^[0-9a-f-]{36}$/i.test(firstArticle.id),
    );
    TestValidator.predicate(
      "article has title",
      firstArticle.title !== undefined && firstArticle.title.length > 0,
    );
    TestValidator.predicate(
      "article has content",
      firstArticle.content !== undefined,
    );
    TestValidator.predicate(
      "article has author",
      firstArticle.author !== undefined,
    );
    TestValidator.predicate(
      "article has section",
      firstArticle.section !== undefined,
    );
    TestValidator.predicate(
      "article has valid comment count",
      typeof firstArticle.commentCount === "number" &&
        firstArticle.commentCount >= 0,
    );
    TestValidator.predicate(
      "article has valid timestamp format",
      firstArticle.createdAt !== undefined &&
        firstArticle.updatedAt !== undefined,
    );
    // Step 7: Validate sorting (oldest first)
    if (searchResult.data.length >= 2) {
      const firstDate = new Date(searchResult.data[0].createdAt).getTime();
      const secondDate = new Date(searchResult.data[1].createdAt).getTime();
      TestValidator.predicate(
        "articles sorted by oldest first",
        firstDate <= secondDate,
      );
    }
  }
}
