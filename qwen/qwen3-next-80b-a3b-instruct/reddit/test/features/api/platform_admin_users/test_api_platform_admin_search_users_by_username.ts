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

export async function test_api_platform_admin_search_users_by_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a platform admin to authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: "platformadmin_1",
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is set internally by authorize_platform_admin_join — do not manually assign
  // 2. Create several test users with varying usernames using utility function
  const userConnections: api.IConnection[] = [];
  const usernames = [
    "john_doe",
    "johanna_smith",
    "johnny_brown",
    "alice_jones",
    "brian_wilson",
  ];
  for (const username of usernames) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_platform_admin_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username,
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
    userConnections.push(userConnection);
  }
  // 3. Perform the search with username 'john' — system automatically filters is_deleted=false users
  const searchResult =
    await api.functional.redditCommunity.platformAdmin.users.index(
      adminConnection,
      {
        body: {
          search: "john",
        } satisfies IRedditCommunityMember.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10); // Default limit
  TestValidator.predicate(
    "pagination records > 0",
    searchResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    searchResult.pagination.pages >= 1,
  );
  // 5. Validate that only users with 'john' in username are returned
  // We expect john_doe, johanna_smith, johnny_brown
  const expectedUsernames = ["john_doe", "johanna_smith", "johnny_brown"];
  TestValidator.equals(
    "result count matches expected",
    searchResult.data.length,
    expectedUsernames.length,
  );
  // 6. Validate that only public fields are returned and sensitive fields are excluded
  for (const user of searchResult.data) {
    TestValidator.predicate("has id", user.id !== undefined);
    TestValidator.predicate("has username", user.username !== undefined);
    TestValidator.predicate(
      "has display_name",
      user.display_name !== undefined,
    );
    TestValidator.predicate("has bio", user.bio !== undefined);
    TestValidator.predicate("has avatar_url", user.avatar_url !== undefined);
    TestValidator.predicate("has karma_score", user.karma_score !== undefined);
    TestValidator.predicate("has created_at", user.created_at !== undefined);
    TestValidator.predicate("has post_count", "post_count" in user);
    TestValidator.predicate(
      "has comment_count",
      "comment_count" in user,
    );
    // Ensure no sensitive fields are returned
    TestValidator.predicate("no email", !("email" in user));
    TestValidator.predicate(
      "no password or token",
      !("password" in user) && !("access" in user) && !("refresh" in user),
    );
    TestValidator.predicate(
      "created_at is ISO date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        user.created_at,
      ),
    );
    // Validate username contains 'john' (case-insensitive)
    TestValidator.predicate(
      "username contains 'john'",
      user.username.toLowerCase().includes("john"),
    );
  }
  // 7. Verify that non-matching users are excluded
  const excludedUsernames = ["alice_jones", "brian_wilson"];
  for (const username of excludedUsernames) {
    TestValidator.predicate(
      "username not included",
      !searchResult.data.some((u) => u.username === username),
    );
  }
}