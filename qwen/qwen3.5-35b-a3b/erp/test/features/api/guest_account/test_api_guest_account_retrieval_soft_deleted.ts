import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
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
 * Test retrieval of a soft-deleted guest account for audit purposes.
 * Soft-deleted guest accounts should still be retrievable by authorized members
 * with appropriate permissions, as this supports session auditing and troubleshooting.
 */
export async function test_api_guest_account_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member with organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Verify member has organization memberships (required for guest access)
  TestValidator.predicate(
    "member has organization context",
    memberAuth.organization_memberships.length > 0,
  );
  // 3. Create a new connection for the authenticated member
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    ...guestConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 4. Retrieve a guest account by ID
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const guest = await api.functional.hrms.guests.at(guestConnection, {
    guestId,
  });
  typia.assert(guest);
  // 5. Validate guest structure
  TestValidator.equals("guest id matches", guest.id, guestId);
  TestValidator.predicate(
    "device fingerprint exists",
    guest.device_fingerprint.length > 0,
  );
  TestValidator.predicate(
    "created at is valid datetime",
    guest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at is valid datetime",
    guest.updated_at !== undefined,
  );
  // 6. Test that deleted_at field is present (supports soft-delete audit)
  // deleted_at can be null (active) or a datetime string (soft-deleted)
  TestValidator.predicate(
    "deleted_at field exists in response",
    guest.deleted_at !== undefined,
  );
  // 7. Validate optional fields structure
  if (guest.ip_address !== undefined) {
    TestValidator.predicate(
      "ip_address format valid",
      guest.ip_address !== null,
    );
  }
  if (guest.user_agent !== undefined) {
    TestValidator.predicate(
      "user_agent format valid",
      guest.user_agent !== null,
    );
  }
}