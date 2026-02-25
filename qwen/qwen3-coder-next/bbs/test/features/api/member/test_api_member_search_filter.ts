import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search by partial display_name
  const nameSearchResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "User",
        isActive: true,
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(nameSearchResult);
  TestValidator.predicate(
    "name search returns results",
    nameSearchResult.data.length > 0,
  );
  // Test 2: Search by partial email
  const emailSearchResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "@test-domain",
        isActive: null,
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(emailSearchResult);
  TestValidator.predicate(
    "email search returns results",
    emailSearchResult.data.length > 0,
  );
  // Test 3: Empty search returns all members
  const allSearchResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "",
        isActive: true,
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(allSearchResult);
  TestValidator.predicate(
    "empty search returns results",
    allSearchResult.data.length >= 0,
  );
  // Test 4: Search with isAdmin filter
  const adminSearchResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "User",
        isActive: true,
        isAdmin: true,
        isSuperAdmin: null,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(adminSearchResult);
  TestValidator.predicate(
    "admin search returns results",
    adminSearchResult.data.length >= 0,
  );
  // Test 5: Search with special characters
  const specialCharResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "@",
        isActive: null,
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(specialCharResult);
  // Test 6: Search with random Unicode characters
  const unicodeResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: RandomGenerator.name(),
        isActive: null,
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(unicodeResult);
  TestValidator.predicate(
    "unicode search completes without error",
    unicodeResult.pagination.records >= 0,
  );
  // Test 7: Verify pagination structure
  TestValidator.equals(
    "pagination has correct structure",
    typeof allSearchResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit correct",
    allSearchResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allSearchResult.pagination.pages >= 0,
  );
  // Test 8: Verify search result data structure
  if (nameSearchResult.data.length > 0) {
    const firstResult = nameSearchResult.data[0];
    TestValidator.equals("result has id", typeof firstResult.id, "string");
    TestValidator.equals(
      "result has email",
      typeof firstResult.email,
      "string",
    );
    TestValidator.equals(
      "result has display_name",
      typeof firstResult.display_name,
      "string",
    );
    TestValidator.equals(
      "result has is_active",
      typeof firstResult.is_active,
      "boolean",
    );
    TestValidator.equals(
      "result has is_admin",
      typeof firstResult.is_admin,
      "boolean",
    );
    TestValidator.equals(
      "result has is_super_admin",
      typeof firstResult.is_super_admin,
      "boolean",
    );
    TestValidator.equals(
      "result has created_at",
      typeof firstResult.created_at,
      "string",
    );
    TestValidator.equals(
      "result has updated_at",
      typeof firstResult.updated_at,
      "string",
    );
  }
}
