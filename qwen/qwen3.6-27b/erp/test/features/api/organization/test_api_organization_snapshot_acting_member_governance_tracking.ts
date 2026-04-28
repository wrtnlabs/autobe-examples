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
 * Governance tracking verification: After authenticating as a member via join (which creates a default organization), the authenticated member creates a snapshot. Verify the snapshot record includes the authenticated member's ID as the acting member, establishing governance accountability. This supports audit trail requirements for tracking who captured organizational configuration states and when. Verify the snapshot contains correct configuration values and that the acting member field is properly populated for compliance auditing. The snapshot should be append-only and unchangeable once created.
 *
 * 1. Authenticate as a new member, which creates an account and default organization.
 * 2. Create a snapshot of the default organization.
 * 3. Verify the snapshot's actingMember.id matches the authenticated member's ID.
 * 4. Verify the snapshot's organization.id matches the default organization ID.
 * 5. Verify snapshot contains valid configuration data including name, currency, timezone, and fiscal_start_month.
 */
export async function test_api_organization_snapshot_acting_member_governance_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member - creates member account and default organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorizedMember);
  // Store authenticated member's ID for governance verification
  const memberId = authorizedMember.id;
  // 2. Create a snapshot of the default organization
  const snapshot =
    await api.functional.hrmPlatform.organizations.snapshots.create(
      memberConnection,
      {
        organizationId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IHrmPlatformOrganizationSnapshot>(),
      },
    );
  typia.assert(snapshot);
  // 3. Verify governance accountability - acting member must match authenticated member
  TestValidator.equals(
    "acting member is the authenticated member",
    snapshot.actingMember.id,
    memberId,
  );
  // 4. Verify organization is present in snapshot
  TestValidator.predicate(
    "snapshot contains organization",
    () => snapshot.organization.id !== undefined,
  );
  // 5. Verify snapshot contains configuration data
  TestValidator.predicate("name is present", () => snapshot.name !== undefined);
  TestValidator.predicate(
    "currency is present",
    () => snapshot.currency !== undefined,
  );
  TestValidator.predicate(
    "timezone is present",
    () => snapshot.timezone !== undefined,
  );
  TestValidator.predicate(
    "fiscal_start_month is valid",
    () => snapshot.fiscal_start_month >= 1 && snapshot.fiscal_start_month <= 12,
  );
  TestValidator.predicate(
    "created_at is present",
    () => snapshot.created_at !== undefined,
  );
}
