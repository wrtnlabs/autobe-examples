import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the primary success path for guest invitation acceptance.
 *
 * Validates the complete guest invitation acceptance workflow including account creation, authorization token generation, and invitation status updates. Ensures that the guest receives proper authentication credentials and that the invitation cannot be reused after acceptance.
 *
 * Special attention is given to verifying that the response contains valid JWT tokens, organization and role context information, and that the invitation status is correctly updated to prevent reuse.
 *
 * 1. Create a guest-specific connection from the base connection.
 * 2. Accept the guest invitation using authorize_guest_join utility.
 * 3. Validate the response contains IHrmTimeTrackGuest.IAuthorized structure.
 * 4. Verify JWT access and refresh tokens are present with expiration times.
 * 5. Verify organization and role summary information are included.
 * 6. Verify the invitation status is 'accepted'.
 * 7. Attempt to reuse the same invitation (should fail).
 */
export async function test_api_guest_invitation_acceptance_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Accept guest invitation using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      invitationToken: RandomGenerator.alphaNumeric(32),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackGuest.IJoin,
  });
  // 3. Validate response structure
  typia.assert(authorized);
  // 4. Verify JWT tokens are present
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has access token expiration",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refresh deadline",
    authorized.token.refreshable_until.length > 0,
  );
  // 5. Verify organization summary
  TestValidator.equals(
    "organization id present",
    typeof authorized.organization.id,
    "string",
  );
  TestValidator.equals(
    "organization name present",
    typeof authorized.organization.name,
    "string",
  );
  TestValidator.predicate(
    "organization has currency",
    authorized.organization.currency.length > 0,
  );
  TestValidator.predicate(
    "organization has timezone",
    authorized.organization.timezone.length > 0,
  );
  // 6. Verify role summary
  TestValidator.equals("role id present", typeof authorized.role.id, "string");
  TestValidator.equals(
    "role name present",
    typeof authorized.role.name,
    "string",
  );
  TestValidator.predicate(
    "role has is_builtin flag",
    typeof authorized.role.is_builtin === "boolean",
  );
  // 7. Verify invitation status is accepted
  TestValidator.equals(
    "invitation status is accepted",
    authorized.status,
    "accepted",
  );
  // 8. Verify guest identity fields
  TestValidator.equals(
    "guest id is uuid format",
    typeof authorized.id,
    "string",
  );
  TestValidator.predicate("has expires_at", authorized.expires_at.length > 0);
  TestValidator.predicate("has created_at", authorized.created_at.length > 0);
  TestValidator.predicate("has updated_at", authorized.updated_at.length > 0);
  TestValidator.equals(
    "deleted_at is null for active invitation",
    authorized.deleted_at,
    null,
  );
  // 9. Test invitation reuse prevention (should fail)
  await TestValidator.error("invitation cannot be reused", async () => {
    const reuseConnection: api.IConnection = { host: connection.host };
    await authorize_guest_join(reuseConnection, {
      body: {
        email: authorized.email,
        invitationToken: RandomGenerator.alphaNumeric(32),
        password: typia.random<string & tags.Format<"password">>(),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmTimeTrackGuest.IJoin,
    });
  });
}
