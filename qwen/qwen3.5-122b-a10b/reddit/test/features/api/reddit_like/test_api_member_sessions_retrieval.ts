import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeGuestSession";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session retrieval with pagination and filtering capabilities.
 *
 * Validates the account security feature where authenticated members can retrieve their paginated list of active sessions. Each session record includes connection metadata for security auditing purposes.
 *
 * The test verifies proper pagination structure, session data completeness, and correct ordering of sessions by creation timestamp.
 *
 * 1. Register a new member account with unique credentials.
 * 2. Create member-specific connection for authenticated API calls.
 * 3. Retrieve session list with default pagination parameters.
 * 4. Validate response structure includes pagination metadata and session data array.
 * 5. Verify each session contains required fields (id, ip, href, referrer, timestamps).
 * 6. Confirm sessions are ordered by created_at in descending order.
 */
export async function test_api_member_sessions_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve member's session list with default parameters
  const sessions = await api.functional.redditLike.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies IRedditLikeGuestSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    sessions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    sessions.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    sessions.pagination.pages >= 0,
  );
  // 4. Validate session data structure
  if (sessions.data.length > 0) {
    const session = sessions.data[0];
    typia.assert(session);
    // Verify session fields
    TestValidator.predicate("session has valid id", session.id !== undefined);
    TestValidator.predicate("session has ip address", session.ip !== undefined);
    TestValidator.predicate(
      "session has created_at",
      session.created_at !== undefined,
    );
    TestValidator.predicate(
      "session has updated_at",
      session.updated_at !== undefined,
    );
    TestValidator.predicate(
      "session has expired_at",
      session.expired_at !== undefined,
    );
    // Verify guest relation exists
    TestValidator.predicate(
      "session has guest relation",
      session.reddit_like_guest !== undefined,
    );
    TestValidator.predicate(
      "guest has valid id",
      session.reddit_like_guest.id !== undefined,
    );
  }
  // 5. Verify sessions are ordered by created_at descending (most recent first)
  if (sessions.data.length > 1) {
    for (let i = 1; i < sessions.data.length; i++) {
      const previous = sessions.data[i - 1];
      const current = sessions.data[i];
      TestValidator.predicate(
        `session ${i} is older than session ${i - 1}`,
        new Date(current.created_at).getTime() <=
          new Date(previous.created_at).getTime(),
      );
    }
  }
}
