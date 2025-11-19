import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that successful login updates last_login_at timestamp.
 *
 * This test validates the last_login_at timestamp update behavior during
 * contributor authentication. The test demonstrates that:
 *
 * 1. Register a new contributor account
 * 2. First login sets last_login_at timestamp
 * 3. Second login updates the timestamp to a later time
 * 4. Failed login attempts do not update the timestamp
 * 5. Subsequent successful login after failure continues to update timestamp
 */
export async function test_api_contributor_login_last_login_timestamp(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  const href = "https://example.com/register";
  const referrer = "https://example.com/home";
  const username = RandomGenerator.alphabets(8);

  const registered = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username: username,
      password,
      href,
      referrer,
      ip: null,
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(registered);

  // Step 2: Perform first login and record last_login_at
  const firstLogin = await api.functional.auth.contributor.login(connection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: null,
    } satisfies IDiscussionBoardContributor.ILogin,
  });
  typia.assert(firstLogin);

  const firstLoginTimestamp = firstLogin.last_login_at;
  TestValidator.predicate(
    "first login should set last_login_at timestamp",
    firstLoginTimestamp !== null && firstLoginTimestamp !== undefined,
  );

  // Step 3: Wait for time interval to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 4: Perform second login
  const secondLogin = await api.functional.auth.contributor.login(connection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: null,
    } satisfies IDiscussionBoardContributor.ILogin,
  });
  typia.assert(secondLogin);

  const secondLoginTimestamp = secondLogin.last_login_at;
  TestValidator.predicate(
    "second login should update last_login_at timestamp",
    secondLoginTimestamp !== null && secondLoginTimestamp !== undefined,
  );

  // Step 5: Verify the second login timestamp is later than the first
  if (
    firstLoginTimestamp &&
    secondLoginTimestamp &&
    typeof firstLoginTimestamp === "string" &&
    typeof secondLoginTimestamp === "string"
  ) {
    const firstTime = new Date(firstLoginTimestamp).getTime();
    const secondTime = new Date(secondLoginTimestamp).getTime();

    TestValidator.predicate(
      "second login timestamp should be later than first login timestamp",
      secondTime > firstTime,
    );
  }

  // Step 6: Wait before attempting failed login
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 7: Test that failed login attempts do not update timestamp
  await TestValidator.error(
    "failed login with wrong password should throw error",
    async () => {
      await api.functional.auth.contributor.login(connection, {
        body: {
          email,
          password: "WrongPassword123!",
          href,
          referrer,
          ip: null,
        } satisfies IDiscussionBoardContributor.ILogin,
      });
    },
  );

  // Step 8: Wait before third successful login
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 9: Perform third login to verify failed attempt didn't affect timestamp
  const thirdLogin = await api.functional.auth.contributor.login(connection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: null,
    } satisfies IDiscussionBoardContributor.ILogin,
  });
  typia.assert(thirdLogin);

  const thirdLoginTimestamp = thirdLogin.last_login_at;
  TestValidator.predicate(
    "third login after failed attempt should update last_login_at timestamp",
    thirdLoginTimestamp !== null && thirdLoginTimestamp !== undefined,
  );

  // Step 10: Verify third login timestamp is greater than second login timestamp
  if (
    secondLoginTimestamp &&
    thirdLoginTimestamp &&
    typeof secondLoginTimestamp === "string" &&
    typeof thirdLoginTimestamp === "string"
  ) {
    const secondTime = new Date(secondLoginTimestamp).getTime();
    const thirdTime = new Date(thirdLoginTimestamp).getTime();

    TestValidator.predicate(
      "third login timestamp should be later than second login, confirming failed attempt did not update timestamp",
      thirdTime > secondTime,
    );
  }
}
