import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member registration for the HRM Time Track system.
 *
 * Validates the complete member registration flow including account creation, email verification token generation, and authorization token issuance. Ensures that new members receive valid credentials for authenticated API access.
 *
 * 1. Creates a new member account with unique email and secure password
 * 2. Generates session context (href, referrer, ip) for audit trail
 * 3. Verifies member identity response contains all required fields
 * 4. Validates authorization tokens are properly issued
 * 5. Confirms account is active (deleted_at is null)
 * 6. Ensures token expiration timestamps are valid and in the future
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // Validate complete response structure
  typia.assert(member);
  // Validate account is active (business logic)
  TestValidator.equals(
    "account is active (deleted_at is null)",
    member.deleted_at,
    null,
  );
  // Validate token expiration is in the future (business logic)
  const now = new Date();
  const expiredAt = new Date(member.token.expired_at);
  const refreshableUntil = new Date(member.token.refreshable_until);
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token valid until in future",
    refreshableUntil > now,
  );
}
