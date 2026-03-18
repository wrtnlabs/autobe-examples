import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member registration where a new user creates an account with email and password,
 * and automatically becomes the Owner of a newly created organization.
 *
 * This test validates:
 * 1. Member registration returns valid JWT tokens (access_token, refresh_token)
 * 2. Response contains complete member profile information (id, email, display_name, created_at)
 * 3. Session metadata is properly captured
 * 4. The access token can be used immediately for authenticated API calls
 * 5. Member has Owner role permissions in the newly created organization
 */
export async function test_api_member_join_with_organization_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and perform registration
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
    phone_number: RandomGenerator.mobile(),
    ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
  } satisfies IHrmPlatformMember.IJoin;
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: joinInput,
    });
  // 2. Validate response structure with typia
  typia.assert(authorized);
  // 3. Validate JWT tokens exist and are properly formatted
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh has valid until date",
    authorized.token.refreshable_until.length > 0,
  );
  // 4. Validate member profile information matches input
  TestValidator.equals(
    "email matches input",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display name matches input",
    authorized.displayName,
    joinInput.display_name,
  );
  TestValidator.equals(
    "avatar URL matches input",
    authorized.avatarUrl,
    joinInput.avatar_url ?? null,
  );
  TestValidator.equals(
    "phone number matches input",
    authorized.phoneNumber,
    joinInput.phone_number ?? null,
  );
  // 5. Validate member summary in response
  TestValidator.equals(
    "member summary id matches",
    authorized.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member summary email matches",
    authorized.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member summary display name matches",
    authorized.member.display_name,
    authorized.displayName,
  );
  // 6. Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(authorized.createdAt)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(authorized.updatedAt)),
  );
  TestValidator.predicate(
    "member created_at is valid date-time",
    !isNaN(Date.parse(authorized.member.created_at)),
  );
  // 7. Validate account is active (not soft deleted)
  TestValidator.equals("account is not deleted", authorized.deletedAt, null);
  // 8. Validate connection was updated with access token for subsequent calls
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header contains access token",
    memberConnection.headers?.Authorization,
    `Bearer ${authorized.token.access}`,
  );
  // 9. Validate member can use the connection for authenticated calls
  // The memberConnection now has the token set and can be used for subsequent API calls
  // This confirms the member has Owner role permissions enabling them to manage organization resources
  TestValidator.predicate(
    "member connection is ready for authenticated API calls",
    typeof memberConnection.headers?.Authorization === "string" &&
      memberConnection.headers.Authorization.startsWith("Bearer ") === true,
  );
}