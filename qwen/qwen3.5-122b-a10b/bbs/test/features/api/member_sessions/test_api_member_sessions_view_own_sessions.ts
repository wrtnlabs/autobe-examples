import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member sessions view own sessions.
 * 1. Member joins the system to obtain authentication credentials
 * 2. Member calls the sessions endpoint with pagination parameters (page=1, limit=30)
 * 3. System returns only sessions belonging to the authenticated member
 * 4. Validate response structure and pagination metadata
 */
export async function test_api_member_sessions_view_own_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins to obtain authentication credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(auth);
  // 2. Member calls sessions endpoint with pagination parameters
  const sessions = await api.functional.discussionBoard.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 30,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Validate response structure and pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessions.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessions.pagination.limit, 30);
  TestValidator.predicate(
    "pagination records non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sessions.pagination.pages >= 0,
  );
  // 4. Validate session data structure if sessions exist
  if (sessions.data.length > 0) {
    const session = sessions.data[0];
    TestValidator.predicate(
      "session has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session has valid IP",
      /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(session.ip),
    );
    TestValidator.predicate(
      "session has valid href URI",
      session.href.startsWith("http"),
    );
    TestValidator.predicate(
      "session has valid referrer URI",
      session.referrer.startsWith("http"),
    );
    TestValidator.predicate(
      "session has valid created_at",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has valid expired_at",
      session.expired_at.length > 0,
    );
    TestValidator.predicate(
      "session guest has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.guest.id,
      ),
    );
    TestValidator.predicate(
      "session guest has device fingerprint",
      session.guest.device_fingerprint.length > 0,
    );
  }
}
