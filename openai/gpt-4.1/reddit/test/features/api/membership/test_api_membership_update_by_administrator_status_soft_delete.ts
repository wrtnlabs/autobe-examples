import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate platform administrator privilege for membership updates (status and
 * soft delete).
 *
 * - Register an administrator (admin join/dependency), which authorizes updates
 * - Generate/define realistic community and member references (from random data)
 * - Update status and deleted_at fields of a given membership (simulate archival)
 * - Check that business rules (status, soft delete allowed for admin) and audit
 *   info are enforced in API response
 * - Validate that response reflects all updates, audit info (updated_at), and
 *   unchanged fields (community, user) remain consistent
 */
export async function test_api_membership_update_by_administrator_status_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register administrator to get admin privileges
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "strongpassword-1-Aa$",
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Generate test membership: define random communityName and membershipId
  const communityName = RandomGenerator.alphabets(10); // E.g., "photofans"
  const membershipId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update DTO: status and deleted_at
  const newStatus = "suspended";
  const newDeletedAt = new Date().toISOString();
  const updateBody = {
    status: newStatus,
    deleted_at: newDeletedAt,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  // 4. Perform the update as admin
  const updated: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.administrator.communities.memberships.update(
      connection,
      {
        communityName,
        membershipId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 5. Validate status and deleted_at updated, audit fields set, core relationships unchanged (id, user, community still present)
  TestValidator.equals("membership id", updated.id, membershipId);
  TestValidator.equals("membership status updated", updated.status, newStatus);
  TestValidator.equals(
    "membership soft deleted",
    updated.deleted_at,
    newDeletedAt,
  );
  TestValidator.predicate(
    "membership updated_at after deleted_at is set",
    new Date(updated.updated_at) >= new Date(newDeletedAt),
  );
  TestValidator.predicate(
    "community summary present",
    !!updated.community && typeof updated.community.id === "string",
  );
  TestValidator.predicate(
    "user summary present",
    !!updated.user && typeof updated.user.id === "string",
  );
}
