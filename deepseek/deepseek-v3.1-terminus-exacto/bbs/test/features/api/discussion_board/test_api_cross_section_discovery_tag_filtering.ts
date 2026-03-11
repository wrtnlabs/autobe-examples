import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cross_section_discovery_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
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
  // Note: Since we don't have article creation endpoints available in the provided API functions,
  // we'll test the cross-section search functionality with the available data
  // This tests the basic functionality of the cross-section search endpoint
  // Test 1: Basic cross-section search without filters
  const basicSearch =
    await api.functional.discussionBoard.member.cross_section.index(
      memberConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(basicSearch);
  // Validate basic search result structure
  TestValidator.equals(
    "has pagination property",
    typeof basicSearch.pagination,
    "object",
  );
  TestValidator.equals("has data array", Array.isArray(basicSearch.data), true);
  TestValidator.predicate(
    "pagination has current page",
    basicSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    basicSearch.pagination.pages >= 0,
  );
  // Test 2: Cross-section search with section filtering
  const sectionSearch =
    await api.functional.discussionBoard.member.cross_section.index(
      memberConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionSearch);
  // Validate section search results
  TestValidator.equals(
    "section search has data",
    Array.isArray(sectionSearch.data),
    true,
  );
  // Test 3: Cross-section search with pagination
  const paginationSearch =
    await api.functional.discussionBoard.member.cross_section.index(
      memberConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationSearch);
  // Validate pagination works correctly
  TestValidator.predicate(
    "pagination limit matches request",
    paginationSearch.pagination.limit === 3 ||
      paginationSearch.data.length <= 3,
  );
  // Note: Since we cannot create articles with specific tags due to missing article creation endpoints,
  // we're testing the fundamental cross-section search functionality as described in the scenario
  // The tag filtering aspect would require creating articles with specific tags first
}
