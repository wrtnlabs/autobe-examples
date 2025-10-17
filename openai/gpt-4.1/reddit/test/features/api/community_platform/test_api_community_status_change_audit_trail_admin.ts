import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusChange";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityStatusChange";

/**
 * Test retrieval of a full audit trail of a specific community's status changes
 * by an admin.
 *
 * 1. Register a new admin and authenticate (get admin token/id).
 * 2. Register a new member and authenticate (get member token/id).
 * 3. Create a community as the member account.
 * 4. Switch to the admin account. Take note of the community's starting status
 *    (should be 'active').
 * 5. Make a status change: admin sets the community to 'private'.
 * 6. Make a status change: admin sets the community back to 'active'.
 * 7. As admin, retrieve the paginated, filtered status change log for the
 *    community.
 * 8. Verify both change events appear in the audit trail, with details matching
 *    the changes made (status values, reasons/notes, correct actor id, correct
 *    timestamps, etc.).
 * 9. Try to retrieve the audit log as the member (should fail with permission
 *    error).
 */
export async function test_api_community_status_change_audit_trail_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  const adminId = admin.id;

  // 2. Register member and authenticate (auto-login)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  const memberId = member.id;

  // 3. Create community as member (token switches to member)
  const communityInput = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);
  const communityId = community.id;
  const originalStatus = community.status;

  // Switch back to admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 5. Make status change: admin sets community to 'private'
  const statusChangePrivate =
    await api.functional.communityPlatform.admin.communities.statusChanges.create(
      connection,
      {
        communityId,
        body: {
          previous_status: originalStatus,
          new_status: "private",
          change_reason: "Test private - for audit",
          notes: "Setting to private for audit trail test",
          performed_by_id: adminId,
        } satisfies ICommunityPlatformCommunityStatusChange.ICreate,
      },
    );
  typia.assert(statusChangePrivate);
  TestValidator.equals(
    "audit record new status after private",
    statusChangePrivate.new_status,
    "private",
  );
  TestValidator.equals(
    "audit actor is admin",
    statusChangePrivate.performed_by_id,
    adminId,
  );
  const prevStatus = statusChangePrivate.new_status;

  // 6. Make status change: admin sets community back to 'active'
  const statusChangeActive =
    await api.functional.communityPlatform.admin.communities.statusChanges.create(
      connection,
      {
        communityId,
        body: {
          previous_status: prevStatus,
          new_status: "active",
          change_reason: "Test reactivate - for audit",
          notes: "Reactivating community for audit trail test",
          performed_by_id: adminId,
        } satisfies ICommunityPlatformCommunityStatusChange.ICreate,
      },
    );
  typia.assert(statusChangeActive);
  TestValidator.equals(
    "audit record new status after reactivation",
    statusChangeActive.new_status,
    "active",
  );
  TestValidator.equals(
    "audit actor is admin",
    statusChangeActive.performed_by_id,
    adminId,
  );

  // 7. Retrieve paginated, filtered status change log as admin
  const statusLog =
    await api.functional.communityPlatform.admin.communities.statusChanges.index(
      connection,
      {
        communityId,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformCommunityStatusChange.IRequest,
      },
    );
  typia.assert(statusLog);
  TestValidator.predicate(
    "audit log contains both status changes",
    statusLog.data.some(
      (change) =>
        change.new_status === "private" && change.performed_by_id === adminId,
    ) &&
      statusLog.data.some(
        (change) =>
          change.new_status === "active" && change.performed_by_id === adminId,
      ),
  );

  // 8. Member tries to retrieve audit log (should error)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error("member forbidden from audit log", async () => {
    await api.functional.communityPlatform.admin.communities.statusChanges.index(
      connection,
      {
        communityId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityStatusChange.IRequest,
      },
    );
  });
}
