import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_section_listing_member_filters_by_search_term(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test basic search functionality - search by name partial match
  const searchByName =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          name: "Politic",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchByName);
  // 3. Test search by description partial match
  const searchByDescription =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          description: "General",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchByDescription);
  // 4. Test combined search with both name and description
  const searchCombined =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          name: "Tech",
          description: "Technology",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchCombined);
  // 5. Test date range filtering - created_at_from
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const searchByDateFrom =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          created_at_from: thirtyDaysAgo.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchByDateFrom);
  // 6. Test date range filtering - created_at_to
  const searchByDateTo =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          created_at_to: new Date().toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchByDateTo);
  // 7. Test combined date range filtering
  const searchByDateRange =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: new Date().toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchByDateRange);
  // 8. Test sorting by name
  const sortBy = await api.functional.discussionBoard.member.sections.index(
    memberConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(sortBy);
  // 9. Test pagination with different limits
  const smallPage = await api.functional.discussionBoard.member.sections.index(
    memberConnection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(smallPage);
  TestValidator.predicate(
    "small page limit respected",
    smallPage.data.length <= 5,
  );
  const largePage = await api.functional.discussionBoard.member.sections.index(
    memberConnection,
    {
      body: {
        limit: 50,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(largePage);
  TestValidator.predicate(
    "large page limit respected",
    largePage.data.length <= 50,
  );
  // 10. Test empty search (no filters)
  const emptySearch =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(emptySearch);
  // 11. Validate pagination metadata reflects filtered results
  TestValidator.equals(
    "pagination current page",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    emptySearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    emptySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    emptySearch.pagination.pages >= 0,
  );
  // 12. Validate section summary structure when sections exist
  if (emptySearch.data.length > 0) {
    const firstSection = emptySearch.data[0];
    TestValidator.predicate(
      "section has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSection.id,
      ),
    );
    TestValidator.predicate(
      "section has non-empty name",
      firstSection.name.length > 0,
    );
    TestValidator.predicate(
      "section has valid created_at timestamp",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstSection.created_at,
      ),
    );
    TestValidator.predicate(
      "section has valid updated_at timestamp",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstSection.updated_at,
      ),
    );
    TestValidator.predicate(
      "section creator has display_name",
      firstSection.creator.display_name.length > 0,
    );
  }
  // 13. Test that search results are consistent across multiple calls
  const search1 = await api.functional.discussionBoard.member.sections.index(
    memberConnection,
    {
      body: {
        name: "General",
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(search1);
  const search2 = await api.functional.discussionBoard.member.sections.index(
    memberConnection,
    {
      body: {
        name: "General",
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(search2);
  TestValidator.equals(
    "search results consistent",
    search1.pagination.records,
    search2.pagination.records,
  );
}
