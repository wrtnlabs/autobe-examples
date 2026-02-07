import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_users_search_with_email_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test user
  const userConnection: api.IConnection = { host: connection.host };
  const createdUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create 3 users with email patterns that should match "john"
  const pattern = "john";
  const matchingUserEmails = [
    "john.doe@example.com",
    "johndoe@example.com",
    "johnsmith@example.com",
  ];
  const matchingUsers = [];
  for (const email of matchingUserEmails) {
    const newUserConnection: api.IConnection = { host: connection.host };
    // Create the user with the specific email
    const newUser = await authorize_user_join(newUserConnection, {
      body: {
        email: email,
        password: "testpassword123",
        name: RandomGenerator.name(),
      } satisfies IEconomyPoliticsBoardUser.IJoin,
    });
    matchingUsers.push(newUser);
  }
  // 3. Search for users matching the pattern
  const results = await api.functional.economyPoliticsBoard.users.index(
    userConnection,
    {
      body: {
        pattern: pattern,
      } satisfies IEconomyPoliticsBoardUser.IRequest,
    },
  );
  typia.assert(results);
  // 4. Validate results contain the expected matching users
  // Ensure we found exactly 3 matching users
  TestValidator.equals(
    "Found exactly 3 matching users",
    results.data.length,
    matchingUsers.length,
  );
  // Ensure all returned users have emails containing the pattern
  const matchingUsersInResults = results.data.filter((user) =>
    user.email.toLowerCase().includes(pattern),
  );
  TestValidator.equals(
    "All users found in results have matching emails",
    matchingUsersInResults.length,
    results.data.length,
  );
  // Verify pagination metadata
  TestValidator.equals(
    "Page size is 10 (default)",
    results.pagination.limit,
    10,
  );
  TestValidator.equals("Current page is 1", results.pagination.current, 1);
  TestValidator.equals(
    "Total number of records matches",
    results.pagination.records,
    matchingUsers.length,
  );
  // Verify that the users returned match those created with the pattern
  matchingUsers.forEach((testUser) => {
    const foundUser = results.data.find((u) => u.id === testUser.id);
    TestValidator.equals(
      `User ID ${testUser.id} found in results`,
      foundUser !== undefined,
      true,
    );
    if (foundUser) {
      TestValidator.equals(
        `User email ${testUser.email} matches`,
        foundUser.email,
        testUser.email,
      );
    }
  });
}
