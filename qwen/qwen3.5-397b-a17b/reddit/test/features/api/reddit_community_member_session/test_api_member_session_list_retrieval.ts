import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test authenticated member session list retrieval.
 * 1. Member registers to obtain authentication tokens
 * 2. Member calls sessions endpoint to retrieve session history
 * 3. Validate paginated response structure and session metadata
 * 4. Verify sensitive data is excluded from response
 */
export async function test_api_member_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve session history
  const sessions = await api.functional.redditCommunity.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
      } satisfies IRedditCommunityMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "has pagination info",
    sessions.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(sessions.data));
  TestValidator.equals("current page", sessions.pagination.current, 1);
  TestValidator.predicate("limit is positive", sessions.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessions.pagination.pages >= 0,
  );
  // 4. Validate session data exists (at least the registration session)
  TestValidator.predicate(
    "has at least one session",
    sessions.data.length >= 1,
  );
  // 5. Validate each session has required metadata
  for (const session of sessions.data) {
    // Session ID validation
    TestValidator.predicate(
      "session has valid UUID",
      /^[0-9a-f-]{36}$/i.test(session.id),
    );
    // Session metadata validation
    TestValidator.predicate(
      "session has IP address",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session has href",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session has referrer",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session has created_at",
      typeof session.created_at === "string",
    );
    TestValidator.predicate(
      "session has expired_at",
      typeof session.expired_at === "string",
    );
    // Validate date-time format
    TestValidator.predicate(
      "created_at is valid ISO date",
      !isNaN(Date.parse(session.created_at)),
    );
    TestValidator.predicate(
      "expired_at is valid ISO date",
      !isNaN(Date.parse(session.expired_at)),
    );
    // Validate member information
    TestValidator.predicate(
      "session has member info",
      session.member !== undefined,
    );
    TestValidator.predicate(
      "member has valid UUID",
      /^[0-9a-f-]{36}$/i.test(session.member.id),
    );
    TestValidator.predicate(
      "member has username",
      typeof session.member.username === "string" &&
        session.member.username.length > 0,
    );
    TestValidator.predicate(
      "member has created_at",
      typeof session.member.created_at === "string",
    );
    // Verify sensitive data is excluded
    const sessionKeys = Object.keys(session);
    TestValidator.predicate(
      "access_token excluded",
      !sessionKeys.includes("access_token"),
    );
    TestValidator.predicate(
      "refresh_token excluded",
      !sessionKeys.includes("refresh_token"),
    );
    TestValidator.predicate("token excluded", !sessionKeys.includes("token"));
  }
  // 6. Validate sessions are sorted by created_at descending (newest first)
  if (sessions.data.length >= 2) {
    for (let i = 0; i < sessions.data.length - 1; i++) {
      const current = new Date(sessions.data[i].created_at).getTime();
      const next = new Date(sessions.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sessions sorted descending (${i} vs ${i + 1})`,
        current >= next,
      );
    }
  }
  // 7. Validate member info matches authenticated user
  const firstSession = sessions.data[0];
  TestValidator.equals(
    "session member ID matches authenticated user",
    firstSession.member.id,
    authorized.id,
  );
}
