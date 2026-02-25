import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_list_members_username_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create test members with usernames containing 'admin' in various cases
  const testMemberConnections: api.IConnection[] = [];
  const testMemberUsernames: string[] = [];
  // Create members with 'admin' in username
  const adminUsernames = [
    "AdminUser",
    "ADMIN123",
    "useradmin",
    "administer",
    "administrator",
  ];
  for (const username of adminUsernames) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_platform_admin_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username,
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
    typia.assert(member);
    testMemberConnections.push(memberConnection);
    testMemberUsernames.push(username);
  }
  // Create additional members without 'admin' in username
  const nonAdminUsernames = [
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(8),
  ];
  for (const username of nonAdminUsernames) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_platform_admin_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username,
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
    typia.assert(member);
  }
  // 3. Create connection with admin token for the search operation
  const searchConnection: api.IConnection = { host: connection.host };
  searchConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 4. Perform search with admin filter
  const searchCriteria: IRedditCommunityMember.IRequest = {
    search: "admin",
    limit: 20,
    sort: "username",
  };
  const response =
    await api.functional.redditCommunity.platformAdmin.members.index(
      searchConnection,
      { body: searchCriteria },
    );
  typia.assert(response);
  // 5. Validate response structure and pagination
  TestValidator.equals("pagination structure", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records > 0",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages > 0",
    response.pagination.pages > 0,
  );
  // 6. Validate that only members with 'admin' in username are returned
  const filteredMembers = response.data;
  TestValidator.equals(
    "correct number of filtered members",
    filteredMembers.length,
    5,
  );
  // 7. Verify case-insensitive matching applies to all returned members
  filteredMembers.forEach((member) => {
    TestValidator.predicate(
      "username contains admin (case-insensitive)",
      member.username.toLowerCase().includes("admin"),
    );
  });
  // 8. Verify that non-admin members were not included
  const foundNonAdminMembers = filteredMembers.filter((filteredMember) =>
    nonAdminUsernames.includes(filteredMember.username),
  );
  TestValidator.equals(
    "no non-admin members included",
    foundNonAdminMembers.length,
    0,
  );
  // 9. Verify sorting by username (alphabetical order)
  const sortedByUsername = [...filteredMembers].sort((a, b) =>
    a.username.localeCompare(b.username),
  );
  TestValidator.index(
    "members sorted by username ascending",
    sortedByUsername,
    filteredMembers,
  );
  // 10. Verify that all members have required fields
  filteredMembers.forEach((member) => {
    TestValidator.notEquals("has id", member.id, null);
    TestValidator.notEquals("has username", member.username, null);
    TestValidator.notEquals("has display_name", member.display_name, null);
    TestValidator.notEquals("has karma_score", member.karma_score, null);
    TestValidator.notEquals("has created_at", member.created_at, null);
  });
}
