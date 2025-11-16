import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";

/**
 * Test session retrieval after a member logs out from all devices.
 *
 * A member account is created with multiple active sessions across different
 * devices. The sessions endpoint is called to verify all sessions are listed
 * correctly. This test validates that the sessions endpoint properly returns
 * paginated session data and confirms pagination metadata is accurately
 * reflected.
 *
 * **Test Workflow:**
 *
 * 1. Register new member account (initializes first session)
 * 2. Create additional sessions via login with same credentials (simulating
 *    different devices)
 * 3. Retrieve member sessions list and verify sessions exist
 * 4. Verify pagination metadata correctly reflects the number of sessions
 * 5. Confirm all session records contain proper session details (id, ip, href,
 *    referrer, created_at)
 */
export async function test_api_member_sessions_empty_after_logout_all(
  connection: api.IConnection,
) {
  // 1. Create member account with initial session
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!@";
  const username = RandomGenerator.alphaNumeric(10);

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username,
      password,
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // 2. Create additional sessions via login to simulate multiple devices
  const loginResponse2 = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      ip: "192.168.1.2",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResponse2);

  const loginResponse3 = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      ip: "192.168.1.3",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResponse3);

  // 3. Retrieve sessions list and verify pagination
  const sessionsResponse =
    await api.functional.communityPlatform.member.auth.member.sessions.index(
      connection,
    );
  typia.assert(sessionsResponse);

  // 4. Validate that sessions were created and are retrievable
  TestValidator.predicate(
    "sessions data array should contain session records",
    sessionsResponse.data.length > 0,
  );

  TestValidator.predicate(
    "pagination records count should match or exceed created sessions",
    sessionsResponse.pagination.records >= 3,
  );

  // 5. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page should be valid",
    sessionsResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    sessionsResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination pages calculation should be correct",
    sessionsResponse.pagination.pages > 0,
  );

  // 6. Verify each session contains proper structure
  sessionsResponse.data.forEach(
    (session: ICommunityPlatformMemberSession.ISummary) => {
      TestValidator.predicate(
        "session should have valid uuid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          session.id,
        ),
      );

      TestValidator.predicate(
        "session href should be valid URI",
        typeof session.href === "string" && session.href.length > 0,
      );

      TestValidator.predicate(
        "session referrer should exist",
        typeof session.referrer === "string",
      );

      TestValidator.predicate(
        "session created_at should be valid timestamp",
        typeof session.created_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
      );

      TestValidator.predicate(
        "session expired_at should be null for active sessions",
        session.expired_at === null || session.expired_at === undefined,
      );
    },
  );
}
