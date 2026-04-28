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
 * Validates JWT token structure and authentication state returned from member registration.
 *
 * Ensures that the registration response contains both access and refresh tokens with proper expiration metadata. The expired_at timestamp indicates when the access token expires, while refreshable_until marks the absolute session deadline for refresh token usage. Verifies the member identity information is correctly included: UUID id, username matching the registration input, and email matching the registration input.
 *
 * Confirms profile fields are in initial state for a newly registered account: display_name is null, bio is null, and karma is 0. Validates that timestamps are properly set for active accounts: created_at and updated_at are populated, and deleted_at is null. The tokens should be usable immediately for authenticated requests to member features.
 *
 * 1. Member registers with valid credentials (random email, password, username, href, referrer).
 * 2. System grants authenticated member status immediately with JWT tokens.
 * 3. Validates response contains both access and refresh tokens with expiration metadata.
 * 4. Verifies member identity (id, username, email) matches registration input.
 * 5. Confirms profile fields in initial state (display_name=null, bio=null, karma=0).
 * 6. Validates timestamps (created_at, updated_at populated, deleted_at is null).
 */
export async function test_api_member_registration_token_initialization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const emailAddress = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const memberUsername = RandomGenerator.name(1);
  const body = {
    email: emailAddress,
    password: password,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, { body });
  typia.assert(authorized);
  const token = authorized.token;
  TestValidator.equals(
    "email matches registration input",
    authorized.email,
    emailAddress,
  );
  TestValidator.equals(
    "username matches registration input",
    authorized.username,
    memberUsername,
  );
  TestValidator.predicate("member id exists", () => authorized.id.length > 0);
  TestValidator.predicate(
    "access token not empty",
    () => token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    () => token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at is set",
    () => token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is set",
    () => token.refreshable_until.length > 0,
  );
  TestValidator.equals(
    "display_name is null for new member",
    authorized.display_name,
    null,
  );
  TestValidator.equals("bio is null for new member", authorized.bio, null);
  TestValidator.predicate("karma is 0 for new member", authorized.karma === 0);
  TestValidator.predicate(
    "created_at is set",
    () => authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    () => authorized.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    authorized.deleted_at,
    null,
  );
}
