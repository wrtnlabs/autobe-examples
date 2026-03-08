import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test member administrator session list retrieval.
 *
 * Verifies that a member can retrieve a paginated list of all user sessions
 * across the platform, including session type discrimination, connection metadata,
 * timestamps, and associated user information.
 */
export async function test_api_session_list_retrieval_by_member_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member account for authentication
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberJoinResult.token.access,
  };
  // 3. Retrieve session list with pagination
  const sessionList =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(sessionList);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessionList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    sessionList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sessionList.pagination.pages >= 0,
  );
  // 5. Validate session data structure if sessions exist
  if (sessionList.data.length > 0) {
    const firstSession = sessionList.data[0];
    // Validate session type discriminator
    TestValidator.predicate(
      "session type is valid",
      firstSession.type === "member" ||
        firstSession.type === "admin" ||
        firstSession.type === "guest",
    );
    // Validate connection metadata
    TestValidator.predicate("session has valid IP", firstSession.ip.length > 0);
    TestValidator.predicate(
      "session has valid href",
      firstSession.href.length > 0,
    );
    // Validate user information
    TestValidator.predicate(
      "user has valid display name",
      firstSession.user.displayName.length > 0,
    );
    TestValidator.predicate(
      "user has valid ID",
      firstSession.user.id.length > 0,
    );
    // Validate timestamps
    TestValidator.predicate(
      "session has valid created_at",
      firstSession.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has valid expired_at",
      firstSession.expired_at.length > 0,
    );
  }
}
