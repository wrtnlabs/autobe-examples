import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_directory_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member before performing directory search operation
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a test member to search for
  // Create a member with username we can search for
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetUsername = RandomGenerator.name();
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(targetMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(targetMember);
  // Wait for system to process (minimal delay for data consistency)
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 3: Test username search with partial matching
  // Search using the first 3 characters of the target username
  const searchTerm = targetUsername.substring(0, 3);
  const searchResult1 =
    await api.functional.communityPlatform.member.members.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Verify that at least one member matching the search term is found
  const matchingMembers = searchResult1.data.filter((m) =>
    m.username.includes(searchTerm),
  );
  TestValidator.equals(
    "search results contain matching username",
    matchingMembers.length > 0,
    true,
  );
  // Verify that all results have the correct ISummary structure
  for (const member of searchResult1.data) {
    TestValidator.predicate("has id property", member.id !== undefined);
    TestValidator.predicate(
      "has username property",
      member.username !== undefined,
    );
    TestValidator.predicate("has email property", member.email !== undefined); // Fixed: Email IS present in ISummary
    TestValidator.predicate(
      "has karma_score property",
      member.karma_score !== undefined,
    );
    TestValidator.predicate(
      "has created_at property",
      member.created_at !== undefined,
    );
    TestValidator.predicate(
      "has is_active property",
      member.is_active !== undefined,
    );
    TestValidator.predicate(
      "has avatar_url property",
      member.avatar_url !== undefined,
    );
    TestValidator.predicate("has roles property", member.roles !== undefined);
    // Validate types
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        member.id,
      ),
    );
    TestValidator.predicate(
      "username is string",
      typeof member.username === "string",
    );
    TestValidator.predicate(
      "email is valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email),
    );
    TestValidator.predicate(
      "karma_score is number",
      typeof member.karma_score === "number",
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        member.created_at,
      ),
    );
    TestValidator.predicate(
      "is_active is boolean",
      typeof member.is_active === "boolean",
    );
    TestValidator.predicate(
      "avatar_url is valid URI",
      member.avatar_url === undefined ||
        /^https?:\/\/.+$/.test(member.avatar_url),
    );
    TestValidator.predicate("roles is array", Array.isArray(member.roles));
    // Ensure roles are valid values
    if (member.roles && member.roles.length > 0) {
      for (const role of member.roles) {
        TestValidator.predicate(
          "role is valid",
          ["member", "moderator", "admin"].includes(role),
        );
      }
    }
  }
  // Step 4: Test pagination parameters
  const limit = 10;
  const page = 1;
  const searchResult2 =
    await api.functional.communityPlatform.member.members.index(
      memberConnection,
      {
        body: {
          limit: limit,
          page: page,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    searchResult2.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination page matches request",
    searchResult2.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination records reflects total",
    searchResult2.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    searchResult2.pagination.pages > 0,
    true,
  );
  // Validate that returned data matches limit
  TestValidator.equals(
    "data length matches limit",
    searchResult2.data.length,
    limit,
  );
  // Step 5: Test sorting by different fields
  // Sort by registrationDate (newest first)
  const searchResult3 =
    await api.functional.communityPlatform.member.members.index(
      memberConnection,
      {
        body: {
          sortBy: "registrationDate",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Verify results are sorted by created_at descending
  for (let i = 0; i < searchResult3.data.length - 1; i++) {
    const current = new Date(searchResult3.data[i].created_at);
    const next = new Date(searchResult3.data[i + 1].created_at);
    TestValidator.predicate(
      "sorted by registrationDate descending",
      current >= next,
    );
  }
  // Sort by karma (highest first) - note: karma_score can be undefined
  const searchResult4 =
    await api.functional.communityPlatform.member.members.index(
      memberConnection,
      {
        body: {
          sortBy: "karma",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Verify results are sorted by karma_score descending (with undefined treated as 0)
  for (let i = 0; i < searchResult4.data.length - 1; i++) {
    const currentKarma = searchResult4.data[i].karma_score || 0;
    const nextKarma = searchResult4.data[i + 1].karma_score || 0;
    TestValidator.predicate(
      "sorted by karma descending",
      currentKarma >= nextKarma,
    );
  }
  // Sort by username (alphabetical)
  const searchResult5 =
    await api.functional.communityPlatform.member.members.index(
      memberConnection,
      {
        body: {
          sortBy: "username",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Verify results are sorted by username ascending
  for (let i = 0; i < searchResult5.data.length - 1; i++) {
    const current = searchResult5.data[i].username;
    const next = searchResult5.data[i + 1].username;
    TestValidator.predicate("sorted by username ascending", current <= next);
  }
}
