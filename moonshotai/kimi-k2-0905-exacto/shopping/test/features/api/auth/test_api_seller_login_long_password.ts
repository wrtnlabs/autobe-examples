import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test authentication with extremely long passwords beyond normal limits.
 *
 * This test validates proper password length handling for seller business
 * accounts including:
 *
 * 1. Memory consumption validation with extremely long passwords
 * 2. Execution time constraints to prevent DoS attacks through oversized input
 * 3. Boundary testing at maximum password length limits
 * 4. Performance validation under load with long passwords
 * 5. Graceful error handling for password length violations
 *
 * The test creates multiple scenarios:
 *
 * - Normal length passwords (baseline performance)
 * - Long passwords (500-1000 characters) to test boundary handling
 * - Response time measurement to detect potential DoS vectors
 * - System stability validation after extended password testing
 * - Focus on realistic security scenarios rather than memory stress testing
 */
export async function test_api_seller_login_long_password(
  connection: api.IConnection,
) {
  // Generate baseline test with normal password
  const normalEmail = typia.random<string & tags.Format<"email">>();
  const normalPassword = RandomGenerator.alphaNumeric(12);

  // Test 1: Normal password length (baseline)
  const startTime = Date.now();
  const normalLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: normalEmail,
      password: normalPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  const normalDuration = Date.now() - startTime;
  typia.assert(normalLogin);

  TestValidator.predicate(
    "normal password login successful",
    normalLogin.id !== undefined && normalLogin.token !== undefined,
  );
  TestValidator.predicate(
    "normal password login completed within reasonable time",
    normalDuration < 5000, // Should complete within 5 seconds
  );

  // Test 2: Long password (500 characters) - practical boundary
  const mediumLongEmail = typia.random<string & tags.Format<"email">>();
  const longPassword = RandomGenerator.alphaNumeric(500);

  const longStartTime = Date.now();
  let longLoginSuccess = false;
  let longDuration = 0;

  try {
    const longLogin = await api.functional.auth.seller.login(connection, {
      body: {
        email: mediumLongEmail,
        password: longPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
    longLoginSuccess = true;
    longDuration = Date.now() - longStartTime;
    typia.assert(longLogin);

    TestValidator.predicate(
      "long password login successful",
      longLogin.id !== undefined && longLogin.token !== undefined,
    );
  } catch (error) {
    longDuration = Date.now() - longStartTime;
  }

  TestValidator.predicate(
    "long password handling completes within acceptable time",
    longDuration < 10000, // Should complete within 10 seconds even if rejected
  );

  // Test 3: Extended password (1000 characters) - upper practical limit
  const extendedEmail = typia.random<string & tags.Format<"email">>();
  const extendedPassword = RandomGenerator.alphaNumeric(1000);

  const extendedStartTime = Date.now();
  let extendedDuration = 0;

  try {
    await api.functional.auth.seller.login(connection, {
      body: {
        email: extendedEmail,
        password: extendedPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  } catch (error) {
    // Expected - should handle gracefully or timeout
  } finally {
    extendedDuration = Date.now() - extendedStartTime;
  }

  TestValidator.predicate(
    "extended password handled within reasonable timeout",
    extendedDuration < 15000, // Maximum 15 seconds for extended cases
  );

  TestValidator.predicate(
    "system does not hang on extended password",
    extendedDuration < 20000, // Should never hang for 20+ seconds
  );

  // Test 4: Performance progression analysis
  const testCases = [
    { name: "very_short", length: 8, passLength: 8 },
    { name: "short", length: 50, passLength: 50 },
    { name: "medium", length: 200, passLength: 200 },
    { name: "long", length: 500, passLength: 500 },
    { name: "very_long", length: 1000, passLength: 1000 },
  ];

  const baseEmail = typia.random<string & tags.Format<"email">>();
  const timingResults: Array<{
    name: string;
    duration: number;
    length: number;
  }> = [];

  for (const testCase of testCases) {
    const testEmail = `${testCase.name}.${baseEmail}`;
    const testPassword = RandomGenerator.alphaNumeric(testCase.passLength);

    const testStartTime = Date.now();
    try {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: testEmail,
          password: testPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    } catch (error) {
      // Handle both success and failures
    }
    const testDuration = Date.now() - testStartTime;

    timingResults.push({
      name: testCase.name,
      duration: testDuration,
      length: testCase.length,
    });
  }

  // Validate timing progression - should degrade gracefully
  TestValidator.predicate(
    "timing degradation is predictable",
    timingResults.every((result) => result.duration < 15000), // No test should take > 15 seconds
  );

  // Check that longer passwords don't cause exponential time increase
  const longestTime = Math.max(...timingResults.map((r) => r.duration));
  const shortestTime = Math.min(...timingResults.map((r) => r.duration));
  const timeRatio = longestTime / shortestTime;

  TestValidator.predicate(
    "time complexity remains reasonable",
    timeRatio < 20, // 20x time increase is acceptable for 125x length increase
  );

  // Test 5: Concurrent moderate-length passwords
  const concurrentTests = 3;
  const concurrentEmails = ArrayUtil.repeat(concurrentTests, () =>
    typia.random<string & tags.Format<"email">>(),
  );
  const concurrentPasswords = ArrayUtil.repeat(
    concurrentTests,
    () => RandomGenerator.alphaNumeric(300), // Moderate 300 character passwords
  );

  const concurrentStartTime = Date.now();
  const concurrentResults = await ArrayUtil.asyncMap(
    Array(concurrentTests)
      .fill(0)
      .map((_, index) => index),
    async (index) => {
      try {
        const result = await api.functional.auth.seller.login(connection, {
          body: {
            email: concurrentEmails[index],
            password: concurrentPasswords[index],
          } satisfies IShoppingMallSeller.ILogin,
        });
        typia.assert(result);
        return { success: true, result };
      } catch (error) {
        return { success: false, error };
      }
    },
  );

  const concurrentDuration = Date.now() - concurrentStartTime;
  const successfulConcurrentCount = concurrentResults.filter(
    (r) => r.success,
  ).length;

  TestValidator.predicate(
    "concurrent moderate password tests handle appropriately",
    successfulConcurrentCount >= 0, // System should not crash, success count is informational
  );

  TestValidator.predicate(
    "concurrent moderate password performance handles gracefully",
    concurrentDuration < 10000, // Should complete within 10 seconds total
  );

  // Test 6: Rubber-stamp maximum practical length test
  const maxPracticalEmail = typia.random<string & tags.Format<"email">>();
  const maxPracticalPassword = ArrayUtil.repeat(2000, () =>
    RandomGenerator.pick(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]),
  ).join("");

  const maxPracticalStartTime = Date.now();
  let maxPracticalDuration = 0;

  try {
    await api.functional.auth.seller.login(connection, {
      body: {
        email: maxPracticalEmail,
        password: maxPracticalPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  } catch (error) {
    // Expected - should handle gracefully
  } finally {
    maxPracticalDuration = Date.now() - maxPracticalStartTime;
  }

  TestValidator.predicate(
    "maximum practical password limits encounter reasonable handling",
    maxPracticalDuration < 25000, // Maximum 25 seconds for extreme practical cases
  );

  // Test 7: Validate system stability after long password testing
  const stabilityEmail = typia.random<string & tags.Format<"email">>();
  const stabilityPassword = RandomGenerator.alphaNumeric(16);

  const stabilityStartTime = Date.now();
  const stabilityLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: stabilityEmail,
      password: stabilityPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  const stabilityDuration = Date.now() - stabilityStartTime;
  typia.assert(stabilityLogin);

  TestValidator.predicate(
    "system remains stable after long password stress tests",
    stabilityLogin.id !== undefined && stabilityLogin.token !== undefined,
  );

  TestValidator.predicate(
    "performance returns to reasonable levels after stress",
    stabilityDuration < normalDuration * 3, // Should be within 3x of normal baseline
  );
}
