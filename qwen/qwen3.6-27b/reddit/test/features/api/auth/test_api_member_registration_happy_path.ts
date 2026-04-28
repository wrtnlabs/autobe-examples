import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration happy path with valid credentials and immediate platform access.
 *
 * Validates the complete registration flow including credential input, account creation, authentication token generation, and initial profile state verification. Ensures the member record is created correctly with proper initialization of all identity and access fields.
 *
 * Tests that the newly registered member receives their identity information, receives JWT access and refresh tokens for subsequent authenticated operations, and has default null empty profile fields since no customization has occurred.
 *
 * 1. Generate random valid registration body with email, password, and username.
 * 2. Call authorization utility function to register member.
 * 3. Validate response matches input credentials (email, username).
 * 4. Validate initial profile state (karma=0, display_name=null, bio=null, deleted_at=null).
 * 5. Validate JWT token structure exists (access and refresh tokens present).
 */
export async function test_api_member_registration_happy_path(
  connection: api.IConnection,
) {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate random valid registration body
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  // Register new member using utility function (updates connection headers with JWT token)
  const member = await authorize_member_join(memberConnection, {
    body,
  });
  typia.assert(member);
  // Validate returned identity matches input
  TestValidator.equals(
    "email matches registration input",
    member.email,
    body.email,
  );
  TestValidator.equals(
    "username matches registration input",
    member.username,
    body.username,
  );
  // Validate initial profile state
  TestValidator.equals("karma starts at 0", member.karma, 0);
  TestValidator.equals(
    "display_name is initially null",
    member.display_name,
    null,
  );
  TestValidator.equals("bio is initially null", member.bio, null);
  TestValidator.equals(
    "deleted_at is null for active account",
    member.deleted_at,
    null,
  );
  // Validate token structure
  TestValidator.predicate("has access token", member.token.access.length > 0);
  TestValidator.predicate("has refresh token", member.token.refresh.length > 0);
}