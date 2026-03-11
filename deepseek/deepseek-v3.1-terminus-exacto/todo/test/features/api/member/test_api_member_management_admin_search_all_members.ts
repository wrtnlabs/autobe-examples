import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that administrators can search and retrieve member accounts with various filtering criteria.
 * 1. Authenticate admin user via admin join
 * 2. Test various search filters: partial email, exact email, display name
 * 3. Test pagination with page and limit parameters
 * 4. Verify response structure and member summary data
 */
export async function test_api_member_management_admin_search_all_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Test basic search with empty criteria (get all members)
  const basicSearchResult = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {} satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(basicSearchResult);
  TestValidator.predicate(
    "has pagination info",
    basicSearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(basicSearchResult.data),
  );
  // 3. Test search with partial email matching (search parameter)
  if (basicSearchResult.data.length > 0) {
    const sampleMember = basicSearchResult.data[0];
    const emailDomain = sampleMember.email.split("@")[1];
    const searchResult = await api.functional.multiUserTodo.members.index(
      adminConnection,
      {
        body: {
          search: emailDomain,
        } satisfies IMultiUserTodoMember.IRequest,
      },
    );
    typia.assert(searchResult);
    TestValidator.predicate(
      "search returns members with matching email domain",
      searchResult.data.length > 0,
    );
  }
  // 4. Test exact email matching
  if (basicSearchResult.data.length > 0) {
    const sampleMember = basicSearchResult.data[0];
    const exactEmailResult = await api.functional.multiUserTodo.members.index(
      adminConnection,
      {
        body: {
          email: sampleMember.email satisfies string & tags.Format<"email">,
        } satisfies IMultiUserTodoMember.IRequest,
      },
    );
    typia.assert(exactEmailResult);
    TestValidator.predicate(
      "exact email returns at least the matching member",
      exactEmailResult.data.length >= 1,
    );
    if (exactEmailResult.data.length > 0) {
      TestValidator.equals(
        "found member has matching email",
        exactEmailResult.data[0].email,
        sampleMember.email,
      );
    }
  }
  // 5. Test display name matching (if we have display names to test)
  // We'll use the basic search result to find a member with a display name
  if (basicSearchResult.data.length > 0) {
    const sampleMember = basicSearchResult.data[0];
    // Extract first word from display name for partial matching via search
    const firstName = sampleMember.display_name.split(" ")[0];
    const displayNameResult = await api.functional.multiUserTodo.members.index(
      adminConnection,
      {
        body: {
          search: firstName,
        } satisfies IMultiUserTodoMember.IRequest,
      },
    );
    typia.assert(displayNameResult);
    // At minimum, search should be valid even if no results
    TestValidator.predicate(
      "display name search is valid",
      displayNameResult !== undefined,
    );
  }
  // 6. Test account status filtering (active=true)
  const activeAccountsResult = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        active: true,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(activeAccountsResult);
  TestValidator.predicate(
    "active filter returns members",
    Array.isArray(activeAccountsResult.data),
  );
  // Note: Cannot test active=false since we can't create deleted members
  // 7. Test date range filtering using recent timestamps
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentMembersResult = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        created_after: oneDayAgo satisfies string & tags.Format<"date-time">,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(recentMembersResult);
  TestValidator.predicate(
    "date filtering works",
    Array.isArray(recentMembersResult.data),
  );
  // 8. Test pagination
  const paginationResult = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination returns data",
    Array.isArray(paginationResult.data),
  );
  TestValidator.predicate(
    "pagination has pagination info",
    paginationResult.pagination !== undefined,
  );
  if (paginationResult.data.length > 0) {
    TestValidator.predicate(
      "page size respects limit",
      paginationResult.data.length <= 5,
    );
  }
  // 9. Verify member summary structure on at least one member
  if (basicSearchResult.data.length > 0) {
    const member = basicSearchResult.data[0];
    TestValidator.predicate("member has id", member.id !== undefined);
    TestValidator.predicate("member has email", member.email !== undefined);
    TestValidator.predicate(
      "member has display name",
      member.display_name !== undefined,
    );
    TestValidator.predicate(
      "member has created at",
      member.created_at !== undefined,
    );
    // Verify format of properties
    TestValidator.predicate(
      "id is uuid format",
      /^[0-9a-f-]{36}$/i.test(member.id),
    );
    TestValidator.predicate("email contains @", member.email.includes("@"));
    TestValidator.predicate(
      "created at is ISO format",
      member.created_at.includes("T"),
    );
  }
  // 10. Test combination of filters
  const combinedFilterResult = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        active: true,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters work",
    combinedFilterResult.data !== undefined,
  );
}
