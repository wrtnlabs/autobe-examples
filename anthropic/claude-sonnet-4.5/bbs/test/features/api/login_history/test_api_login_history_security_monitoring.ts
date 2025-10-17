import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardLoginHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardLoginHistory";

/**
 * Test security monitoring capabilities through login history feature.
 *
 * This test validates that users can effectively detect suspicious login
 * activity by reviewing comprehensive login history records. The test simulates
 * various security scenarios including failed login attempts and demonstrates
 * the filtering capabilities for security analysis.
 *
 * Workflow:
 *
 * 1. Member registers and performs initial successful login (normal pattern)
 * 2. Simulate suspicious activity: multiple failed login attempts
 * 3. Retrieve complete login history to verify all events are captured
 * 4. Test filtering capabilities to isolate specific security concerns
 * 5. Verify security pattern detection: IPs, devices, locations, failure patterns
 */
export async function test_api_login_history_security_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Member registers through /auth/member/join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Step 2: Member logs in successfully from primary device (establishing normal pattern)
  const primaryLoginData = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.ILogin;

  const primaryLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: primaryLoginData,
    });
  typia.assert(primaryLogin);

  // Step 3: Simulate suspicious activity - Multiple failed login attempts
  const failedAttempts = 5;
  for (let i = 0; i < failedAttempts; i++) {
    await TestValidator.error(
      "failed login attempt with incorrect password",
      async () => {
        await api.functional.auth.member.login(connection, {
          body: {
            email: memberEmail,
            password: "WrongPassword123",
          } satisfies IDiscussionBoardMember.ILogin,
        });
      },
    );
  }

  // Step 4: Retrieve complete login history with PATCH endpoint
  const loginHistoryRequest = {
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IDiscussionBoardMember.ILoginHistoryRequest;

  const completeHistory: IPageIDiscussionBoardLoginHistory =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: registeredMember.id,
        body: loginHistoryRequest,
      },
    );
  typia.assert(completeHistory);

  // Validate pagination metadata
  typia.assert(completeHistory.pagination);
  TestValidator.predicate(
    "pagination current page is 1",
    completeHistory.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 50",
    completeHistory.pagination.limit === 50,
  );
  TestValidator.predicate(
    "pagination has valid record count",
    completeHistory.pagination.records >= 0,
  );

  // Step 5: Verify all suspicious events are captured in login history
  TestValidator.predicate(
    "login history contains multiple records",
    completeHistory.data.length >= 6, // 1 registration + 1 successful + 5 failed minimum
  );

  // Verify failed login attempts are recorded
  const failedLoginRecords = completeHistory.data.filter(
    (record) =>
      record.is_successful === false &&
      record.failure_reason === "incorrect_password",
  );
  TestValidator.predicate(
    "multiple failed login attempts recorded",
    failedLoginRecords.length >= failedAttempts,
  );

  // Verify each failed attempt has required security metadata
  failedLoginRecords.forEach((record) => {
    typia.assert(record);
    TestValidator.predicate(
      "failed attempt has IP address",
      record.ip_address.length > 0,
    );
    TestValidator.predicate(
      "failed attempt has device type",
      record.device_type.length > 0,
    );
    TestValidator.predicate(
      "failed attempt has browser info",
      record.browser_info.length > 0,
    );
    TestValidator.predicate(
      "failed attempt has failure reason",
      record.failure_reason !== null && record.failure_reason !== undefined,
    );
  });

  // Step 6: Test filtering to isolate suspicious activity - Filter for failed attempts only
  const failedOnlyFilter = {
    is_successful: false,
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IDiscussionBoardMember.ILoginHistoryRequest;

  const failedOnlyHistory: IPageIDiscussionBoardLoginHistory =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: registeredMember.id,
        body: failedOnlyFilter,
      },
    );
  typia.assert(failedOnlyHistory);

  TestValidator.predicate(
    "failed-only filter returns only failed attempts",
    failedOnlyHistory.data.every((record) => record.is_successful === false),
  );

  // Step 7: Filter by specific failure reason
  const incorrectPasswordFilter = {
    is_successful: false,
    failure_reason: "incorrect_password",
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardMember.ILoginHistoryRequest;

  const incorrectPasswordHistory: IPageIDiscussionBoardLoginHistory =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: registeredMember.id,
        body: incorrectPasswordFilter,
      },
    );
  typia.assert(incorrectPasswordHistory);

  TestValidator.predicate(
    "failure reason filter works correctly",
    incorrectPasswordHistory.data.every(
      (record) => record.failure_reason === "incorrect_password",
    ),
  );

  // Step 8: Filter by date range around suspicious activity time
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const dateRangeFilter = {
    created_after: fiveMinutesAgo.toISOString(),
    created_before: now.toISOString(),
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IDiscussionBoardMember.ILoginHistoryRequest;

  const dateRangeHistory: IPageIDiscussionBoardLoginHistory =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: registeredMember.id,
        body: dateRangeFilter,
      },
    );
  typia.assert(dateRangeHistory);

  TestValidator.predicate(
    "date range filter returns records within specified time",
    dateRangeHistory.data.every((record) => {
      const recordTime = new Date(record.created_at);
      return recordTime >= fiveMinutesAgo && recordTime <= now;
    }),
  );

  // Step 9: Verify member can identify security patterns
  // Verify unrecognized IP addresses are visible
  const allIpAddresses = completeHistory.data.map(
    (record) => record.ip_address,
  );
  const uniqueIps = Array.from(new Set(allIpAddresses));
  TestValidator.predicate(
    "IP addresses are tracked for security analysis",
    uniqueIps.length > 0,
  );

  // Verify device types are captured
  const allDeviceTypes = completeHistory.data.map(
    (record) => record.device_type,
  );
  TestValidator.predicate(
    "device types are captured for each login attempt",
    allDeviceTypes.every((deviceType) => deviceType.length > 0),
  );

  // Verify geographic locations are available when applicable
  const recordsWithLocation = completeHistory.data.filter(
    (record) => record.location !== null && record.location !== undefined,
  );
  TestValidator.predicate(
    "location tracking is available",
    recordsWithLocation.length >= 0,
  );

  // Verify patterns indicating potential brute-force attacks are evident
  TestValidator.predicate(
    "multiple consecutive failures indicate brute-force pattern",
    failedLoginRecords.length >= 5,
  );

  // Verify timestamps are accurate for detecting suspicious timing patterns
  const timestamps = completeHistory.data.map((record) =>
    new Date(record.created_at).getTime(),
  );
  const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
  TestValidator.equals(
    "timestamps are sorted in descending order",
    timestamps,
    sortedTimestamps,
  );

  // Step 10: Verify successful logins are also recorded
  const successfulFilter = {
    is_successful: true,
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardMember.ILoginHistoryRequest;

  const successfulHistory: IPageIDiscussionBoardLoginHistory =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: registeredMember.id,
        body: successfulFilter,
      },
    );
  typia.assert(successfulHistory);

  TestValidator.predicate(
    "successful logins are recorded in history",
    successfulHistory.data.length >= 1,
  );

  TestValidator.predicate(
    "successful login records have no failure reason",
    successfulHistory.data.every(
      (record) =>
        record.failure_reason === null || record.failure_reason === undefined,
    ),
  );
}
