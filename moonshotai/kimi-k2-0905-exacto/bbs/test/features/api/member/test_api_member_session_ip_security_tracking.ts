import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

export async function test_api_member_session_ip_security_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for session security testing
  const memberCredentials = {
    username: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "_"),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  // Step 2: Initial login to establish baseline session
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials.email,
      password_hash: memberCredentials.password,
    } satisfies IEconomicDiscussionMember.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Test session creation with IP security tracking
  // Simulate different network locations for security monitoring
  const deviceSessions: IEconomicDiscussionMemberSession[] = [];

  // Helper function to generate IPv4 format
  const generateIpv4 = () => {
    // Random IP in private ranges (192.168.x.x) for testing
    return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}` as string &
      tags.Format<"ipv4">;
  };

  await ArrayUtil.asyncRepeat(3, async (index) => {
    // Simulate different IP addresses representing different devices/networks
    const externalIpForSession = generateIpv4();
    const href = `https://discussion.example.com/login?device=browser_${index}`;
    const referrer = "https://google.com/search";

    // Create sessions from different network IPs
    const session =
      await api.functional.economicDiscussion.member.members.sessions.create(
        connection,
        {
          memberId: loginResponse.member.id,
          body: {
            href: href,
            referrer: referrer,
            ip: externalIpForSession,
          } satisfies IEconomicDiscussionMemberSession.ICreate,
        },
      );
    deviceSessions.push(session);
  });

  // Step 4: Verify session IP tracking works correctly
  TestValidator.equals(
    "first session member matches creator",
    deviceSessions[0].member.id,
    loginResponse.member.id,
  );
  TestValidator.equals(
    "first session member username matches expected profile",
    deviceSessions[0].member.username,
    loginResponse.member.username,
  );
  TestValidator.notEquals(
    "different sessions have different IP addresses",
    deviceSessions[0].ip,
    deviceSessions[1].ip,
  );
  TestValidator.predicate(
    "ip addresses follow IPv4 format pattern",
    deviceSessions.every((session) =>
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        session.ip,
      ),
    ),
  );
  TestValidator.predicate(
    "sessions have href metadata",
    deviceSessions.every((session) => session.href.includes("browser_")),
  );
  TestValidator.predicate(
    "sessions track referrer",
    deviceSessions.every(
      (session) => session.referrer === "https://google.com/search",
    ),
  );
  TestValidator.predicate(
    "sessions track creation timestamp",
    deviceSessions.every(
      (session) => new Date(session.created_at).getTime() > 0,
    ),
  );
  TestValidator.predicate(
    "sessions contain member summary",
    deviceSessions.every(
      (session) => session.member.email === memberCredentials.email,
    ),
  );
}
