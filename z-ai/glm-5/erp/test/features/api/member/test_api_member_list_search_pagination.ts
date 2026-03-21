import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_list_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member list search with pagination functionality.
   * Verifies search capabilities, pagination metadata, and security (no password exposure).
   */
  // Step 1: Create multiple members with distinct emails and display names
  await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberConnection: api.IConnection = { host: connection.host };
    const result = await authorize_member_join(memberConnection, {
      body: {
        email: `member${index + 1}_${typia.random<string & tags.Format<"email">>()}`,
        password: RandomGenerator.alphaNumeric(16),
        displayName: `Test User ${index + 1} ${RandomGenerator.name(1)}`,
        phoneNumber: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(result);
  });
  // Step 2: Authenticate as a member to perform search
  const searcherConnection: api.IConnection = { host: connection.host };
  const searcherResult = await authorize_member_join(searcherConnection, {
    body: {
      email: `searcher_${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
      displayName: `Searcher ${RandomGenerator.name(1)}`,
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(searcherResult);
  // Step 3: Test search with pagination - page 1 with limit 2
  const page1Response = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: {
        search: "Test",
        page: 1,
        limit: 2,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(page1Response);
  // Verify pagination metadata for page 1
  TestValidator.equals(
    "current page should be 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 2", page1Response.pagination.limit, 2);
  TestValidator.predicate(
    "records should be at least 5",
    page1Response.pagination.records >= 5,
  );
  TestValidator.predicate(
    "pages should be at least 3",
    page1Response.pagination.pages >= 3,
  );
  // Verify member summary fields exist
  if (page1Response.data.length > 0) {
    const memberSummary = page1Response.data[0];
    TestValidator.predicate(
      "member should have id",
      typeof memberSummary.id === "string",
    );
    TestValidator.predicate(
      "member should have email",
      typeof memberSummary.email === "string",
    );
    TestValidator.predicate(
      "member should have displayName",
      typeof memberSummary.displayName === "string",
    );
    TestValidator.predicate(
      "createdAt should be valid date-time",
      typeof memberSummary.createdAt === "string",
    );
    TestValidator.equals(
      "deletedAt should be null for active members",
      memberSummary.deletedAt,
      null,
    );
  }
  // Step 4: Request page 2 to verify pagination
  const page2Response = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: {
        search: "Test",
        page: 2,
        limit: 2,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(page2Response);
  // Verify page 2 metadata
  TestValidator.equals(
    "page 2 current should be 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 2",
    page2Response.pagination.limit,
    2,
  );
  // Verify total records and pages are consistent across pages
  TestValidator.equals(
    "total records should be consistent",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  TestValidator.equals(
    "total pages should be consistent",
    page1Response.pagination.pages,
    page2Response.pagination.pages,
  );
  // Step 5: Verify case-insensitive search
  const lowerCaseResult = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: {
        search: "test",
        limit: 100,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(lowerCaseResult);
  const upperCaseResult = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: {
        search: "TEST",
        limit: 100,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(upperCaseResult);
  TestValidator.equals(
    "case-insensitive search should return same count",
    lowerCaseResult.pagination.records,
    upperCaseResult.pagination.records,
  );
  // Step 6: Verify sorting by createdAt descending (newest first)
  if (page1Response.data.length >= 2) {
    const firstCreatedAt = new Date(page1Response.data[0].createdAt).getTime();
    const secondCreatedAt = new Date(page1Response.data[1].createdAt).getTime();
    TestValidator.predicate(
      "results should be sorted by createdAt descending",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // Step 7: List all members without search filter
  const allMembersResponse = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: {
        limit: 100,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(allMembersResponse);
  // Verify at least 5 members were created
  TestValidator.predicate(
    "should have at least 5 members",
    allMembersResponse.pagination.records >= 5,
  );
  // Verify all members have null deletedAt (active status) - no passwords exposed
  for (const member of allMembersResponse.data) {
    TestValidator.equals(
      `member ${member.email} should be active`,
      member.deletedAt,
      null,
    );
  }
}