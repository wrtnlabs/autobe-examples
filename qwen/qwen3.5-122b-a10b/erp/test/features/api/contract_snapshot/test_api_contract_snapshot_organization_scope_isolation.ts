import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test contract snapshot organization scope isolation.
 *
 * Validates that contract snapshot data is properly isolated between different organizations in a multi-tenant HRM system. Ensures that members can only access contract snapshots belonging to their current organization context and cannot view snapshots from other organizations.
 *
 * This test demonstrates multi-tenancy enforcement by:
 * 1. Creating two separate member accounts with their own organization contexts
 * 2. Querying contract snapshots from each member's organization
 * 3. Verifying that each member only sees snapshots from their own organization
 * 4. Confirming data isolation across organization boundaries
 *
 * 1. Create first member account with organization context.
 * 2. Create second member account with separate organization context.
 * 3. Query contract snapshots from first member's organization.
 * 4. Query contract snapshots from second member's organization.
 * 5. Validate that snapshot data is properly isolated between organizations.
 */
export async function test_api_contract_snapshot_organization_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member with their organization
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth: IHrmMember.IAuthorized = await authorize_member_join(
    member1Connection,
    {
      body: {
        email: `member1.${typia.random<string & tags.Format<"uuid">>()}@test.com`,
        password: "Password123!",
        href: "https://test.com/register",
        referrer: "https://test.com",
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(member1Auth);
  // 2. Create second member with their organization
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth: IHrmMember.IAuthorized = await authorize_member_join(
    member2Connection,
    {
      body: {
        email: `member2.${typia.random<string & tags.Format<"uuid">>()}@test.com`,
        password: "Password123!",
        href: "https://test.com/register",
        referrer: "https://test.com",
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(member2Auth);
  // 3. Query snapshots from first member's organization
  const snapshots1: IPageIHrmContractSnapshot.ISummary =
    await api.functional.hrm.member.snapshots.index(member1Connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmContractSnapshot.IRequest,
    });
  typia.assert(snapshots1);
  // 4. Query snapshots from second member's organization
  const snapshots2: IPageIHrmContractSnapshot.ISummary =
    await api.functional.hrm.member.snapshots.index(member2Connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmContractSnapshot.IRequest,
    });
  typia.assert(snapshots2);
  // 5. Validate organization isolation
  // Each member should only see snapshots from their own organization
  // The snapshot data should be isolated by organization context
  const member1OrganizationId = member1Auth.organizations?.[0]?.id;
  const member2OrganizationId = member2Auth.organizations?.[0]?.id;
  // Verify both members have organizations
  if (member1OrganizationId && member2OrganizationId) {
    // Validate that snapshots are properly scoped to each organization
    // All snapshots from member1 should belong to member1's organization
    for (const snapshot of snapshots1.data) {
      // Each snapshot's employee should belong to member1's organization
      const snapshotOrgId = snapshot.employee.organization.id;
      if (snapshotOrgId !== member1OrganizationId) {
        throw new Error(
          `Snapshot organization ${snapshotOrgId} does not match member1 organization ${member1OrganizationId}`,
        );
      }
    }
    // All snapshots from member2 should belong to member2's organization
    for (const snapshot of snapshots2.data) {
      // Each snapshot's employee should belong to member2's organization
      const snapshotOrgId = snapshot.employee.organization.id;
      if (snapshotOrgId !== member2OrganizationId) {
        throw new Error(
          `Snapshot organization ${snapshotOrgId} does not match member2 organization ${member2OrganizationId}`,
        );
      }
    }
    // If organizations are different, snapshots should not overlap
    if (member1OrganizationId !== member2OrganizationId) {
      const member1SnapshotIds = new Set(snapshots1.data.map((s) => s.id));
      const member2SnapshotIds = new Set(snapshots2.data.map((s) => s.id));
      // Verify no overlap in snapshot IDs between organizations
      for (const snapshotId of member1SnapshotIds) {
        if (member2SnapshotIds.has(snapshotId)) {
          throw new Error(
            `Snapshot ${snapshotId} appears in both organizations - isolation failed`,
          );
        }
      }
    }
  }
}
