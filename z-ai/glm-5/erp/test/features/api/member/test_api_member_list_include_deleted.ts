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

export async function test_api_member_list_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member to perform searches
  const searcherConnection: api.IConnection = { host: connection.host };
  const searcherMember = await authorize_member_join(searcherConnection, {});
  // Create 5 member accounts for testing
  const testMembers = await ArrayUtil.asyncRepeat(5, async () => {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        displayName: RandomGenerator.name(),
      },
    });
    return member;
  });
  // Test 1: Search for active members (deletedAt: false)
  const activeResult = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: { deletedAt: false },
    },
  );
  typia.assert(activeResult);
  // Verify all returned members have null deletedAt
  TestValidator.predicate(
    "all active members have null deletedAt",
    activeResult.data.every((m) => m.deletedAt === null),
  );
  // Verify created test members appear in active results
  const testEmails = testMembers.map((m) => m.email);
  const activeEmails = activeResult.data.map((m) => m.email);
  TestValidator.predicate(
    "all test members in active results",
    testEmails.every((email) => activeEmails.includes(email)),
  );
  // Verify searcher member is also in active results
  TestValidator.predicate(
    "searcher member in active results",
    activeEmails.includes(searcherMember.email),
  );
  // Test 2: Search for deleted members (deletedAt: true)
  const deletedResult = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: { deletedAt: true },
    },
  );
  typia.assert(deletedResult);
  // Verify all deleted members have non-null deletedAt
  TestValidator.predicate(
    "all deleted members have non-null deletedAt",
    deletedResult.data.every((m) => m.deletedAt !== null),
  );
  // Verify test members are NOT in deleted results
  TestValidator.predicate(
    "no test members in deleted results",
    deletedResult.data.every((m) => !testEmails.includes(m.email)),
  );
  // Test 3: Search without deletedAt (default behavior - should match active)
  const defaultResult = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResult);
  // Verify default returns only active members
  TestValidator.predicate(
    "default returns only active members",
    defaultResult.data.every((m) => m.deletedAt === null),
  );
  // Verify default results match active results count
  TestValidator.equals(
    "default and active result counts match",
    defaultResult.pagination.records,
    activeResult.pagination.records,
  );
  // Test 4: Search with displayName filter combined with deletedAt
  const searchDisplayName = testMembers[0].display_name;
  const searchByDisplayName = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: {
        displayName: searchDisplayName,
        deletedAt: false,
      },
    },
  );
  typia.assert(searchByDisplayName);
  // Verify results match displayName filter (case-insensitive partial match)
  TestValidator.predicate(
    "displayName search returns matching results",
    searchByDisplayName.data.every((m) =>
      m.displayName.toLowerCase().includes(searchDisplayName.toLowerCase()),
    ),
  );
  // Verify the specific test member is found
  TestValidator.predicate(
    "specific test member found by displayName",
    searchByDisplayName.data.some((m) => m.email === testMembers[0].email),
  );
  // Test 5: Pagination with deletedAt filter
  const paginatedResult = await api.functional.erpHrm.member.members.index(
    searcherConnection,
    {
      body: { page: 1, limit: 2, deletedAt: false },
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedResult.pagination.pages >= 0,
  );
}
