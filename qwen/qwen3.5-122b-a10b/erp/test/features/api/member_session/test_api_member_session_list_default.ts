import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session list retrieval with default pagination settings.
 *
 * Validates that an authenticated member can retrieve their own session history with proper pagination, ordering, and security controls. The test ensures session metadata is correctly exposed while sensitive authentication tokens remain protected.
 *
 * The test verifies the complete session listing workflow including member registration, authentication, session creation, and retrieval with proper data isolation between members.
 *
 * 1. Register a new member with email, password, and session context.
 * 2. Authenticate the member and obtain JWT tokens.
 * 3. Create member-specific connection with authorization token.
 * 4. Retrieve session list with default pagination (empty request body).
 * 5. Validate response structure and pagination metadata.
 * 6. Verify session records contain required connection metadata.
 * 7. Confirm sensitive JWT tokens are NOT exposed in session summary.
 * 8. Validate data isolation - only member's own sessions returned.
 * 9. Verify default ordering by created_at descending (newest first).
 */
export async function test_api_member_session_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(auth);
  // 2. Create member-specific connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: auth.token.access,
    },
  };
  // 3. Retrieve session list with default pagination (empty body)
  const sessions: IPageIHrmMemberSession.ISummary =
    await api.functional.hrm.member.member.sessions.index(
      authenticatedConnection,
      {
        body: {} satisfies IHrmMemberSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    sessions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sessions.pagination.pages >= 0,
  );
  // 5. Validate session data structure and business logic
  if (sessions.data.length > 0) {
    const firstSession = sessions.data[0];
    typia.assert(firstSession);
    // 6. Verify sensitive data is NOT exposed (access_token, refresh_token should not exist)
    const sessionKeys = Object.keys(firstSession);
    TestValidator.predicate(
      "access_token NOT exposed in session summary",
      !sessionKeys.includes("access_token"),
    );
    TestValidator.predicate(
      "refresh_token NOT exposed in session summary",
      !sessionKeys.includes("refresh_token"),
    );
    // 7. Validate data isolation - session belongs to authenticated member
    TestValidator.equals(
      "session member matches authenticated member",
      firstSession.member.id,
      auth.id,
    );
  }
  // 8. Validate ordering - newest sessions first (created_at descending)
  if (sessions.data.length > 1) {
    for (let i = 0; i < sessions.data.length - 1; i++) {
      const current = new Date(sessions.data[i].created_at).getTime();
      const next = new Date(sessions.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `session ${i + 1} is newer than session ${i + 2}`,
        current >= next,
      );
    }
  }
}
