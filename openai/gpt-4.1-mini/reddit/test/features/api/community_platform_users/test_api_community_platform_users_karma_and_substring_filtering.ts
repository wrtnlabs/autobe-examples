import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_users_karma_and_substring_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for admin (assumed admin for testing authorization)
  const adminConnection: api.IConnection = { host: connection.host };
  /**
   * Helper function to retrieve filtered users.
   */
  async function getUsers(
    body: Partial<ICommunityPlatformUser.IRequest>,
  ): Promise<IPageICommunityPlatformUser.ISummary> {
    const output = await api.functional.communityPlatform.users.index(
      adminConnection,
      {
        body: body as ICommunityPlatformUser.IRequest,
      },
    );
    typia.assert(output);
    return output;
  }
  // 1. Prepare test user data pool to confirm filtering
  // Since no user creation API given, we rely on existing users.
  // We will attempt pagination and filter tests on existing data.
  // 2. Test karmaMin filter: users with karma >= karmaMin
  {
    const karmaMin = 10;
    const output = await getUsers({ karmaMin: karmaMin, limit: 50, page: 1 });
    typia.assert(output);
    TestValidator.predicate(
      `All users have karma >= ${karmaMin}`,
      output.data.every((user) => user.karma >= karmaMin),
    );
  }
  // 3. Test karmaMax filter: users with karma <= karmaMax
  {
    const karmaMax = 20;
    const output = await getUsers({ karmaMax: karmaMax, limit: 50, page: 1 });
    typia.assert(output);
    TestValidator.predicate(
      `All users have karma <= ${karmaMax}`,
      output.data.every((user) => user.karma <= karmaMax),
    );
  }
  // 4. Test karmaMin and karmaMax combined: karma between range
  {
    const karmaMin = 10;
    const karmaMax = 20;
    const output = await getUsers({
      karmaMin: karmaMin,
      karmaMax: karmaMax,
      limit: 50,
      page: 1,
    });
    typia.assert(output);
    TestValidator.predicate(
      `All users have karma between ${karmaMin} and ${karmaMax}`,
      output.data.every(
        (user) => user.karma >= karmaMin && user.karma <= karmaMax,
      ),
    );
  }
  // 5. Test substring filter on email (case-insensitive)
  {
    const allOutput = await getUsers({ limit: 100, page: 1 });
    typia.assert(allOutput);
    TestValidator.predicate(
      "At least one user exists for email substring test",
      allOutput.data.length > 0,
    );
    if (allOutput.data.length === 0) return;
    const sampleUser = RandomGenerator.pick(allOutput.data);
    const emailSample = sampleUser.email;
    // Pick a substring from email (safe substring)
    const substring = emailSample.substring(1, Math.min(5, emailSample.length));
    const output = await getUsers({ email: substring, limit: 50, page: 1 });
    typia.assert(output);
    TestValidator.predicate(
      `All matched users email contains substring '${substring.toLowerCase()}' (case-insensitive)`,
      output.data.every((user) =>
        user.email.toLowerCase().includes(substring.toLowerCase()),
      ),
    );
  }
  // 6. Test substring filter on username (case-insensitive)
  {
    const allOutput = await getUsers({ limit: 100, page: 1 });
    typia.assert(allOutput);
    TestValidator.predicate(
      "At least one user exists for username substring test",
      allOutput.data.length > 0,
    );
    if (allOutput.data.length === 0) return;
    const sampleUser = RandomGenerator.pick(allOutput.data);
    const usernameSample = sampleUser.username;
    const substring = usernameSample.substring(
      1,
      Math.min(5, usernameSample.length),
    );
    const output = await getUsers({ username: substring, limit: 50, page: 1 });
    typia.assert(output);
    TestValidator.predicate(
      `All matched users username contains substring '${substring.toLowerCase()}' (case-insensitive)`,
      output.data.every((user) =>
        user.username.toLowerCase().includes(substring.toLowerCase()),
      ),
    );
  }
  // 7. Test combined substring filter on email and username
  {
    const allOutput = await getUsers({ limit: 100, page: 1 });
    typia.assert(allOutput);
    TestValidator.predicate(
      "At least one user exists for combined email and username substring test",
      allOutput.data.length > 0,
    );
    if (allOutput.data.length === 0) return;
    const sampleUserEmail = RandomGenerator.pick(allOutput.data);
    const sampleUserUsername = RandomGenerator.pick(allOutput.data);
    const emailSubstring = sampleUserEmail.email.substring(
      1,
      Math.min(5, sampleUserEmail.email.length),
    );
    const usernameSubstring = sampleUserUsername.username.substring(
      1,
      Math.min(5, sampleUserUsername.username.length),
    );
    const output = await getUsers({
      email: emailSubstring,
      username: usernameSubstring,
      limit: 50,
      page: 1,
    });
    typia.assert(output);
    TestValidator.predicate(
      `All matched users email contains substring '${emailSubstring.toLowerCase()}' (case-insensitive)`,
      output.data.every((user) =>
        user.email.toLowerCase().includes(emailSubstring.toLowerCase()),
      ),
    );
    TestValidator.predicate(
      `All matched users username contains substring '${usernameSubstring.toLowerCase()}' (case-insensitive)`,
      output.data.every((user) =>
        user.username.toLowerCase().includes(usernameSubstring.toLowerCase()),
      ),
    );
  }
  // 8. Test pagination: Confirm correct pagination properties and record counts
  {
    const limit = 5;
    const page1 = await getUsers({ limit, page: 1 });
    const page2 = await getUsers({ limit, page: 2 });
    const page1000 = await getUsers({ limit, page: 1000 });
    typia.assert(page1);
    typia.assert(page2);
    typia.assert(page1000);
    TestValidator.equals(
      "pagination current page for page1",
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit for page1",
      page1.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination records number should be >= 0",
      page1.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages number should be >= 0",
      page1.pagination.pages >= 0,
    );
    TestValidator.equals(
      "pagination current page for page2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit for page2",
      page2.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination records number should be >= 0",
      page2.pagination.records >= 0,
    );
    TestValidator.equals(
      "pagination current page for page1000",
      page1000.pagination.current,
      1000,
    );
    TestValidator.equals(
      "pagination limit for page1000",
      page1000.pagination.limit,
      limit,
    );
    // page 1000 likely returns empty data if no such many pages
    TestValidator.predicate(
      "page1000 data length should be 0 or less than limit",
      page1000.data.length <= limit && page1000.data.length >= 0,
    );
    // Validate pages count is consistent
    TestValidator.predicate(
      "pages count should be consistent",
      page1.pagination.pages >= page2.pagination.current &&
        page1.pagination.pages >= page1000.pagination.current,
    );
    // Validate that page1 and page2 have non-overlapping user IDs
    const idsPage1 = new Set(page1.data.map((user) => user.id));
    const idsPage2 = new Set(page2.data.map((user) => user.id));
    idsPage1.forEach((id) => {
      TestValidator.predicate("user id not in both pages", !idsPage2.has(id));
    });
    // Validate that the total record counts isn't less than returned data length
    TestValidator.predicate(
      "records count is bigger or equals to user data length (page 1)",
      page1.pagination.records >= page1.data.length,
    );
    TestValidator.predicate(
      "records count is bigger or equals to user data length (page 2)",
      page2.pagination.records >= page2.data.length,
    );
  }
}
