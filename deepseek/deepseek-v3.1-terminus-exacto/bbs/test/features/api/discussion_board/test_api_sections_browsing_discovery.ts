import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_sections_browsing_discovery(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member using utility function
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
  // Test 1: Default browsing without search term
  const defaultSections =
    await api.functional.discussionBoard.member.topics.index(memberConnection, {
      body: {
        // Empty request to get all sections
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(defaultSections);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination data",
    defaultSections.pagination !== undefined,
  );
  TestValidator.predicate(
    "has section data array",
    Array.isArray(defaultSections.data),
  );
  // Test 2: Browsing with search term
  const searchTerm = RandomGenerator.substring(RandomGenerator.name());
  const searchedSections =
    await api.functional.discussionBoard.member.topics.index(memberConnection, {
      body: {
        search: searchTerm,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchedSections);
  // Test 3: Browsing with default sorting (newest first)
  const sortedSections =
    await api.functional.discussionBoard.member.topics.index(memberConnection, {
      body: {
        sort: "created_at:desc",
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(sortedSections);
  // Test 4: Pagination flow
  if (sortedSections.pagination.pages > 1) {
    // Test first page
    const firstPage = await api.functional.discussionBoard.member.topics.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: sortedSections.pagination.limit,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(firstPage);
    TestValidator.equals("first page number", firstPage.pagination.current, 1);
    // Test last page
    const lastPage = await api.functional.discussionBoard.member.topics.index(
      memberConnection,
      {
        body: {
          page: sortedSections.pagination.pages,
          limit: sortedSections.pagination.limit,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page number",
      lastPage.pagination.current,
      sortedSections.pagination.pages,
    );
  }
  // Validate section summary structure
  if (sortedSections.data.length > 0) {
    const section = sortedSections.data[0];
    TestValidator.predicate(
      "section has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
    );
    TestValidator.predicate(
      "section has non-empty name",
      section.name.length > 0,
    );
    TestValidator.predicate(
      "section has valid creation date",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(section.created_at),
    );
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination has valid current page",
      sortedSections.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination has valid limit",
      sortedSections.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination has valid records count",
      sortedSections.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has valid pages count",
      sortedSections.pagination.pages >= 0,
    );
  }
}
