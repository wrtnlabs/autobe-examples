import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";

export async function test_api_member_sessions_pagination_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for session testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!@#";

  const createMemberResponse = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: memberPassword,
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(createMemberResponse);

  // Step 2: Create multiple sessions by logging in multiple times
  // Each login creates a new session record
  const sessionCount = 5;
  const createdSessions = await ArrayUtil.asyncRepeat(
    sessionCount,
    async (index) => {
      const loginResponse = await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: memberPassword,
          ip: `192.168.1.${index + 2}`,
          href: `https://example.com/login-${index}`,
          referrer: `https://example.com/page-${index}`,
        } satisfies ICommunityPlatformMember.ILogin,
      });
      typia.assert(loginResponse);
      return loginResponse;
    },
  );
  typia.assert(createdSessions);
  TestValidator.equals(
    "created sessions count matches expected",
    createdSessions.length,
    sessionCount,
  );

  // Step 3: Retrieve all sessions with pagination
  const sessionsResponse =
    await api.functional.communityPlatform.member.auth.member.sessions.index(
      connection,
    );
  typia.assert(sessionsResponse);

  // Step 4: Validate pagination metadata structure
  const pagination = sessionsResponse.pagination;
  TestValidator.predicate(
    "pagination object exists",
    pagination !== null && pagination !== undefined,
  );

  TestValidator.predicate(
    "current page is non-negative integer",
    typeof pagination.current === "number" &&
      pagination.current >= 0 &&
      Number.isInteger(pagination.current),
  );

  TestValidator.predicate(
    "limit is positive integer",
    typeof pagination.limit === "number" &&
      pagination.limit > 0 &&
      Number.isInteger(pagination.limit),
  );

  TestValidator.predicate(
    "total records is non-negative integer",
    typeof pagination.records === "number" &&
      pagination.records >= 0 &&
      Number.isInteger(pagination.records),
  );

  TestValidator.predicate(
    "total pages is non-negative integer",
    typeof pagination.pages === "number" &&
      pagination.pages >= 0 &&
      Number.isInteger(pagination.pages),
  );

  // Step 5: Validate pagination calculations are consistent
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculation matches ceiling(records / limit)",
    pagination.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "data array length does not exceed limit",
    sessionsResponse.data.length <= pagination.limit,
  );

  TestValidator.predicate(
    "data array length matches or is less than records when on first page",
    sessionsResponse.data.length <= pagination.records,
  );

  // Step 6: Validate each session in data array
  TestValidator.predicate(
    "all sessions in data have valid structure",
    sessionsResponse.data.every(
      (session) =>
        session.id !== undefined &&
        session.href !== undefined &&
        typeof session.href === "string" &&
        session.created_at !== undefined &&
        typeof session.created_at === "string",
    ),
  );

  // Step 7: Verify at least one session was created
  TestValidator.predicate(
    "at least one session exists in response",
    sessionsResponse.data.length > 0,
  );

  // Step 8: Validate that total records is consistent with created sessions
  TestValidator.predicate(
    "total records is at least the number of sessions we created",
    pagination.records >= sessionCount,
  );
}
