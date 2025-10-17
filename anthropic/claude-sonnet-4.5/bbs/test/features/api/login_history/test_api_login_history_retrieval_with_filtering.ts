import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardLoginHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardLoginHistory";

export async function test_api_login_history_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Perform multiple login attempts to generate login history

  // First successful login
  const login1 = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(login1);

  // Second successful login
  const login2 = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(login2);

  // Failed login attempt with wrong password
  await TestValidator.error("should fail with incorrect password", async () => {
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: "WrongPassword123",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });

  // Third successful login
  const login3 = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(login3);

  // Step 3: Retrieve complete login history with no filters
  const allHistory =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: member.id,
        body: {} satisfies IDiscussionBoardMember.ILoginHistoryRequest,
      },
    );
  typia.assert(allHistory);

  // Step 4: Verify all login attempts appear (3 successful + 1 failed = 4 total)
  TestValidator.predicate(
    "login history should contain all attempts",
    allHistory.data.length >= 4,
  );

  // Verify email_attempted matches the actual email for audit accuracy
  TestValidator.predicate(
    "all login attempts use correct email",
    allHistory.data.every((record) => record.email_attempted === memberEmail),
  );

  // Step 5: Verify results are sorted by timestamp descending (most recent first)
  if (allHistory.data.length >= 2) {
    for (let i = 0; i < allHistory.data.length - 1; i++) {
      const current = new Date(allHistory.data[i].created_at).getTime();
      const next = new Date(allHistory.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `login history sorted descending at index ${i}`,
        current >= next,
      );
    }
  }

  // Step 6: Test filtering by success status - retrieve only successful logins
  const successfulOnly =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: member.id,
        body: {
          is_successful: true,
        } satisfies IDiscussionBoardMember.ILoginHistoryRequest,
      },
    );
  typia.assert(successfulOnly);

  // Step 7: Verify only successful login records are returned
  TestValidator.predicate(
    "all returned logins are successful",
    successfulOnly.data.every((record) => record.is_successful === true),
  );

  TestValidator.predicate(
    "successful logins count is at least 3",
    successfulOnly.data.length >= 3,
  );

  // Step 8: Test filtering by failure status
  const failedOnly =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: member.id,
        body: {
          is_successful: false,
        } satisfies IDiscussionBoardMember.ILoginHistoryRequest,
      },
    );
  typia.assert(failedOnly);

  // Verify only failed login records are returned
  TestValidator.predicate(
    "all returned logins are failed",
    failedOnly.data.every((record) => record.is_successful === false),
  );

  TestValidator.predicate(
    "failed logins count is at least 1",
    failedOnly.data.length >= 1,
  );

  // Verify failed logins have failure_reason populated
  if (failedOnly.data.length > 0) {
    TestValidator.predicate(
      "failed login has failure_reason",
      failedOnly.data.every(
        (record) =>
          record.failure_reason !== null &&
          record.failure_reason !== undefined &&
          record.failure_reason.length > 0,
      ),
    );
  }

  // Step 9: Test filtering by date range - retrieve logins from last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const dateRangeHistory =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: member.id,
        body: {
          created_after: oneHourAgo,
          created_before: now,
        } satisfies IDiscussionBoardMember.ILoginHistoryRequest,
      },
    );
  typia.assert(dateRangeHistory);

  // Step 10: Verify only recent logins within the specified date range appear
  TestValidator.predicate(
    "all logins within date range",
    dateRangeHistory.data.every((record) => {
      const recordTime = new Date(record.created_at).getTime();
      const afterTime = new Date(oneHourAgo).getTime();
      const beforeTime = new Date(now).getTime();
      return recordTime >= afterTime && recordTime <= beforeTime;
    }),
  );

  // Step 11: Test filtering by IP address
  if (allHistory.data.length > 0) {
    const firstIpAddress = allHistory.data[0].ip_address;

    const ipFilteredHistory =
      await api.functional.discussionBoard.member.users.loginHistory.index(
        connection,
        {
          userId: member.id,
          body: {
            ip_address: firstIpAddress,
          } satisfies IDiscussionBoardMember.ILoginHistoryRequest,
        },
      );
    typia.assert(ipFilteredHistory);

    // Step 12: Verify only logins from that IP address are returned
    TestValidator.predicate(
      "all logins from specified IP",
      ipFilteredHistory.data.every(
        (record) => record.ip_address === firstIpAddress,
      ),
    );
  }

  // Step 13: Test pagination - retrieve first page with page size of 2
  const paginatedHistory =
    await api.functional.discussionBoard.member.users.loginHistory.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardMember.ILoginHistoryRequest,
      },
    );
  typia.assert(paginatedHistory);

  // Step 14: Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page is 1",
    paginatedHistory.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit is 2",
    paginatedHistory.pagination.limit,
    2,
  );

  TestValidator.predicate(
    "pagination data length is at most 2",
    paginatedHistory.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination total records matches",
    paginatedHistory.pagination.records >= 4,
  );

  // Verify pagination pages calculation is correct
  const expectedPages = Math.ceil(
    paginatedHistory.pagination.records / paginatedHistory.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    paginatedHistory.pagination.pages,
    expectedPages,
  );

  // Verify each login history record contains required fields
  if (allHistory.data.length > 0) {
    const sampleRecord = allHistory.data[0];

    TestValidator.predicate(
      "login history has id",
      typeof sampleRecord.id === "string" && sampleRecord.id.length > 0,
    );

    TestValidator.predicate(
      "login history has email_attempted",
      typeof sampleRecord.email_attempted === "string",
    );

    TestValidator.predicate(
      "login history has is_successful",
      typeof sampleRecord.is_successful === "boolean",
    );

    TestValidator.predicate(
      "login history has ip_address",
      typeof sampleRecord.ip_address === "string",
    );

    TestValidator.predicate(
      "login history has device_type",
      typeof sampleRecord.device_type === "string",
    );

    TestValidator.predicate(
      "login history has browser_info",
      typeof sampleRecord.browser_info === "string",
    );

    TestValidator.predicate(
      "login history has created_at",
      typeof sampleRecord.created_at === "string",
    );
  }
}
