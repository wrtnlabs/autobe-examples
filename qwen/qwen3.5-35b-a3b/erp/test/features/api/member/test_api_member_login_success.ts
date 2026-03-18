import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login with valid credentials.
 * 1. Register a new member account (automatic organization creation)
 * 2. Login with registered credentials
 * 3. Verify response structure (IHrmsMember.IAuthorized)
 * 4. Validate token usage for subsequent requests
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  // This automatically creates member + personal organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword: string = RandomGenerator.alphaNumeric(16);
  const joinedMember: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: joinPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: (typia.random<string>() satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(joinedMember);
  // Step 2: Login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInMember: IHrmsMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email: joinedMember.email,
        password: joinPassword,
      } satisfies IHrmsMember.ILogin,
    },
  );
  typia.assert(loggedInMember);
  // Step 3: Validate response structure
  // Verify member info
  TestValidator.equals(
    "member email matches",
    loggedInMember.email,
    joinedMember.email,
  );
  TestValidator.equals(
    "member display name matches",
    loggedInMember.display_name,
    joinedMember.display_name,
  );
  // Verify organization membership exists (should be at least 1 from registration)
  TestValidator.predicate(
    "has at least one organization membership",
    loggedInMember.organization_memberships.length >= 1,
  );
  // Step 4: Validate organization membership structure
  const membership: IHrmsOrganizationMember.ISummary =
    loggedInMember.organization_memberships[0];
  typia.assert(membership);
  // Verify organization details
  TestValidator.equals(
    "organization id matches",
    membership.organization.id,
    joinedMember.organization_memberships[0].organization.id,
  );
  TestValidator.predicate(
    "organization name exists",
    membership.organization.name.length > 0,
  );
  // Verify member details within membership
  TestValidator.equals(
    "member id matches",
    membership.member.id,
    joinedMember.id,
  );
  TestValidator.equals(
    "member display name matches",
    membership.member.display_name,
    joinedMember.display_name,
  );
  // Verify role details
  typia.assert(membership.organizationRole);
  TestValidator.equals(
    "role is built-in",
    membership.organizationRole.is_builtin,
    true,
  );
  // Step 5: Validate token structure and expiration
  typia.assert(loggedInMember.token);
  const token: IAuthorizationToken = loggedInMember.token;
  // Access token should be a valid JWT (non-empty string)
  TestValidator.predicate("access token is non-empty", token.access.length > 0);
  // Refresh token should be a valid JWT (non-empty string)
  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );
  // Verify expiration timestamps are valid ISO dates
  const accessExpiry: Date = new Date(token.expired_at);
  const refreshDeadline: Date = new Date(token.refreshable_until);
  TestValidator.predicate(
    "access token expiration is future",
    accessExpiry.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable until is future",
    refreshDeadline.getTime() > Date.now(),
  );
  // Step 6: Validate token expiration times
  // Access token should expire within reasonable time (15 minutes max)
  const accessExpiresInMinutes: number =
    (accessExpiry.getTime() - Date.now()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires within 20 minutes",
    accessExpiresInMinutes <= 20 && accessExpiresInMinutes > 0,
  );
  // Refresh token should be valid for at least 7 days
  const refreshableUntilMinutes: number =
    (refreshDeadline.getTime() - Date.now()) / (1000 * 60);
  TestValidator.predicate(
    "refreshable until at least 7 days",
    refreshableUntilMinutes >= 7 * 24 * 60,
  );
  // Step 7: Verify token can be used for authenticated requests
  // After authorize_member_login, loginConnection.headers is updated with new token
  TestValidator.predicate(
    "login connection has authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
  // Verify the authorization header starts with Bearer
  TestValidator.predicate(
    "authorization header format is Bearer",
    typeof loginConnection.headers?.Authorization === "string" &&
      loginConnection.headers.Authorization.startsWith("Bearer ") === true,
  );
}