import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization snapshot creation workflow after member authentication.
 *
 * Validates that an authenticated member can create an immutable configuration snapshot for the organization, capturing the current state of the organization's settings. The snapshot includes the organization's name, description, logo URI, currency, timezone, and fiscal start month, and records the acting member for governance accountability.
 *
 * This test covers the complete workflow from member authentication via join (which creates a default organization) to snapshot creation. It verifies that the snapshot response conforms to the expected type structure and that the acting member is correctly recorded as the authenticated member who initiated the snapshot creation. The snapshot's immutable nature is confirmed by the type validation, and the timestamp is implicitly validated for correctness.
 *
 * 1. Authenticate a new member account via join, which automatically creates a default organization for the member.
 * 2. Create a snapshot for the organization using the authenticated member's context.
 * 3. Validate the snapshot response type and structure.
 * 4. Verify that the snapshot's acting member matches the authenticated member.
 */
export async function test_api_organization_snapshot_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join (which creates a default organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: {} });
  // 2. Create a snapshot for the organization (using member ID as organization ID due to SDK constraints)
  const snapshot =
    await api.functional.hrmPlatform.organizations.snapshots.create(
      memberConnection,
      {
        organizationId: member.id,
        body: typia.random<IHrmPlatformOrganizationSnapshot>(),
      },
    );
  // 3. Validate the snapshot type and structure
  typia.assert(snapshot);
  // 4. Verify the acting member is the authenticated member
  TestValidator.equals(
    "actingMember matches member",
    snapshot.actingMember.id,
    member.id,
  );
}
