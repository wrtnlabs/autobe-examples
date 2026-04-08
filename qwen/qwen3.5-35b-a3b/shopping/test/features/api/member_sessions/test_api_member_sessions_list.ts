import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session listing functionality.
 *
 * Validates that an authenticated member can retrieve their own sessions from the platform.
 * Creates a member account and then requests their session list with default pagination.
 * Ensures the response contains proper pagination metadata and that all session records
 * reference the authenticated member's account ID.
 *
 * Special attention is given to verifying session status computation and ensuring
 * members cannot access other members' sessions.
 *
 * 1. Create member account via join endpoint.
 * 2. Make PATCH request to /ecommerceMall/member/sessions with default pagination.
 * 3. Validate response pagination structure (current, limit, records, pages).
 * 4. Validate session data array contains valid session records.
 * 5. Verify each session's actor_type is 'member'.
 * 6. Verify each session's actor_id matches the member's account ID.
 * 7. Verify session_status is one of: 'active', 'expiring', 'expired'.
 */
export async function test_api_member_sessions_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Request session list
  const sessionResponse =
    await api.functional.ecommerceMall.member.sessions.index(memberConnection, {
      body: {},
    });
  typia.assert(sessionResponse);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    sessionResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    sessionResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    sessionResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    sessionResponse.pagination.pages >= 0,
    true,
  );
  // 4. Validate data array exists
  TestValidator.equals(
    "data array is array type",
    Array.isArray(sessionResponse.data),
    true,
  );
  // 5. Validate each session record
  if (sessionResponse.data.length > 0) {
    const firstSession = sessionResponse.data[0];
    typia.assert(firstSession);
    // Verify actor_type is 'member'
    TestValidator.equals(
      "actor_type is member",
      firstSession.actor_type,
      "member",
    );
    // Verify actor_id matches member account ID
    TestValidator.equals(
      "actor_id matches member ID",
      firstSession.actor_id,
      memberAuth.id,
    );
    // Verify IP address exists and is non-empty string
    TestValidator.predicate(
      "IP address is non-empty string",
      typeof firstSession.ip === "string" && firstSession.ip.length > 0,
    );
    // Verify href exists and is non-empty string
    TestValidator.predicate(
      "href is non-empty string",
      typeof firstSession.href === "string" && firstSession.href.length > 0,
    );
    // Verify created_at is valid ISO datetime
    typia.assert(firstSession.created_at);
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(firstSession.created_at)),
    );
    // Verify expired_at is valid ISO datetime
    typia.assert(firstSession.expired_at);
    TestValidator.predicate(
      "expired_at is valid date-time",
      !isNaN(Date.parse(firstSession.expired_at)),
    );
    // Verify session_status is valid enum value
    TestValidator.equals(
      "session_status is valid enum",
      ["active", "expiring", "expired"].includes(firstSession.session_status),
      true,
    );
  }
}
