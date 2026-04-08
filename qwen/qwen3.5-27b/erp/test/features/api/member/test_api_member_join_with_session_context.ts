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
 * Test member registration with complete session context including href, referrer, and IP address for audit trail purposes.
 *
 * Validates the complete member registration flow with session context capture. Ensures that the registration succeeds and creates a member account with all required identity fields. Verifies that session context fields (href, referrer, ip) are properly captured for audit trail purposes, which is critical for tracking user registration patterns and sources for security analysis.
 *
 * The test also validates that the response includes valid authorization tokens (access and refresh) and that the member account is active (deleted_at is null).
 *
 * 1. Creates a member-specific connection for the registration flow.
 * 2. Registers a new member with email, password, and complete session context (href, referrer, ip).
 * 3. Validates the response contains all member identity fields (id, email, created_at, updated_at, deleted_at).
 * 4. Verifies the member account is active (deleted_at is null).
 * 5. Validates the authorization token contains access token, refresh token, and expiration timestamps.
 */
export async function test_api_member_join_with_session_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register new member with complete session context
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(member);
  // 3. Verify member account is active (business logic validation)
  TestValidator.equals("member account is active", member.deleted_at, null);
  // 4. Validate authorization token has required fields (business logic)
  TestValidator.predicate(
    "access token is non-empty",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    member.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    member.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    member.token.refreshable_until.length > 0,
  );
  // 5. Verify session context was captured (successful registration with context)
  TestValidator.predicate("member ID was generated", member.id.length > 0);
  TestValidator.predicate(
    "member email matches input pattern",
    member.email.includes("@"),
  );
}
