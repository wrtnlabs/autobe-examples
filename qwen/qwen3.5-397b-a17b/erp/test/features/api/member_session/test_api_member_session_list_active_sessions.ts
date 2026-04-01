import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving the authenticated member's active login sessions with default filtering.
 *
 * This test verifies that:
 * 1. A member can retrieve their own session list after authentication
 * 2. The response includes proper pagination metadata
 * 3. Each session contains required fields without sensitive data
 * 4. Only active (non-expired) sessions are returned by default
 * 5. The current session from authentication appears in the results
 */
export async function test_api_member_session_list_active_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const authorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Call PATCH /hrmPlatform/member/sessions with empty request body
  const response = await api.functional.hrmPlatform.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // 4. Verify response structure contains pagination and data array
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. Verify pagination metadata
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 1);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Verify at least one session exists (the current session)
  TestValidator.predicate(
    "at least one session exists",
    response.data.length >= 1,
  );
  // 7. Verify each session contains required fields and structure
  for (const session of response.data) {
    // Verify session has all required fields
    TestValidator.predicate("session id exists", session.id !== undefined);
    TestValidator.predicate("session ip exists", session.ip !== undefined);
    TestValidator.predicate("session href exists", session.href !== undefined);
    TestValidator.predicate(
      "session referrer exists",
      session.referrer !== undefined,
    );
    TestValidator.predicate(
      "session device_info exists",
      session.device_info !== undefined,
    );
    TestValidator.predicate(
      "session created_at exists",
      session.created_at !== undefined,
    );
    TestValidator.predicate(
      "session expired_at exists",
      session.expired_at !== undefined,
    );
    TestValidator.predicate(
      "session member exists",
      session.member !== undefined,
    );
    // Verify member summary structure
    TestValidator.predicate(
      "member id exists",
      session.member.id !== undefined,
    );
    TestValidator.predicate(
      "member display_name exists",
      session.member.display_name !== undefined,
    );
    // Verify sensitive fields are NOT exposed
    TestValidator.predicate(
      "access_token_hash not exposed",
      !("access_token_hash" in session),
    );
    TestValidator.predicate(
      "refresh_token_hash not exposed",
      !("refresh_token_hash" in session),
    );
  }
  // 8. Verify all returned sessions are active (expired_at is in the future)
  const now = new Date();
  for (const session of response.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} is active (not expired)`,
      expiredAt >= now,
    );
  }
  // 9. Verify the authenticated member's sessions are returned (data isolation)
  for (const session of response.data) {
    TestValidator.equals(
      "session member id matches authenticated member",
      session.member.id,
      authorized.id,
    );
  }
}
