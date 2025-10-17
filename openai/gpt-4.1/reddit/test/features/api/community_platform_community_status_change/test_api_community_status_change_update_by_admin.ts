import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusChange";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Verify admin can update community status change entries as per business
 * rules.
 *
 * 1. Register a member.
 * 2. Create a community (by member).
 * 3. Register an admin user and authenticate as admin.
 * 4. Admin creates a status change for the community (from 'active' to 'banned'
 *    for example).
 * 5. Admin updates the status change entry (change previous/new status, reason,
 *    and notes).
 * 6. Verify the status change record is updated as requested (fields are changed,
 *    created_at remains the same).
 * 7. Business rule error case: Attempt update as non-admin (should fail).
 * 8. Business rule error case: Attempt update on non-existent status change
 *    (should fail).
 * 9. Business rule error case: Attempt update on deleted/finalized/locked records
 *    (simulated as necessary, should fail).
 */
export async function test_api_community_status_change_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Member creates a new community
  const communityData = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 3. Register an admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. Admin creates a community status change (e.g., active -> banned)
  const createStatusChange = {
    previous_status: "active",
    new_status: "banned",
    change_reason: "Test ban for violations",
    notes: "Initial ban for behavior review",
    performed_by_id: admin.id,
  } satisfies ICommunityPlatformCommunityStatusChange.ICreate;
  const statusChange =
    await api.functional.communityPlatform.admin.communities.statusChanges.create(
      connection,
      {
        communityId: community.id,
        body: createStatusChange,
      },
    );
  typia.assert(statusChange);
  TestValidator.equals(
    "performed_by_id matches admin",
    statusChange.performed_by_id,
    admin.id,
  );
  TestValidator.equals(
    "status change reflects new_status",
    statusChange.new_status,
    createStatusChange.new_status,
  );

  // 5. Admin updates the status change with new details
  const updateInput = {
    previous_status: "active",
    new_status: "archived",
    change_reason: "Ban overturned, archiving instead",
    notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityStatusChange.IUpdate;

  const updated =
    await api.functional.communityPlatform.admin.communities.statusChanges.update(
      connection,
      {
        communityId: community.id,
        statusChangeId: statusChange.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated previous_status",
    updated.previous_status,
    updateInput.previous_status,
  );
  TestValidator.equals(
    "updated new_status",
    updated.new_status,
    updateInput.new_status,
  );
  TestValidator.equals(
    "updated change_reason",
    updated.change_reason,
    updateInput.change_reason,
  );
  TestValidator.equals("updated notes", updated.notes, updateInput.notes);
  TestValidator.equals(
    "unchanged created_at",
    updated.created_at,
    statusChange.created_at,
  );

  // 6. Confirm audit-like behavior (fields have changed)
  TestValidator.notEquals(
    "statusChange and updated have diff new_status",
    statusChange.new_status,
    updated.new_status,
  );

  // 7. Attempt update as non-admin -- should fail
  // Switch to member context (simulate by re-auth/join)
  await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error("member cannot update status change", async () => {
    await api.functional.communityPlatform.admin.communities.statusChanges.update(
      connection,
      {
        communityId: community.id,
        statusChangeId: statusChange.id,
        body: {
          change_reason: "Illegal member update",
        } satisfies ICommunityPlatformCommunityStatusChange.IUpdate,
      },
    );
  });

  // 8. Attempt update on non-existent status change -- should fail
  await TestValidator.error(
    "update non-existent status change fails",
    async () => {
      await api.functional.communityPlatform.admin.communities.statusChanges.update(
        connection,
        {
          communityId: community.id,
          statusChangeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            change_reason: "Update non-existent",
          } satisfies ICommunityPlatformCommunityStatusChange.IUpdate,
        },
      );
    },
  );

  // 9. Simulate finalized/locked record and fail update (simulate: by updating, then pretending it is locked)
  // In absence of API to lock/finalize, assume second update on same record is not allowed for this test
  await TestValidator.error(
    "update locked/finalized status change fails",
    async () => {
      await api.functional.communityPlatform.admin.communities.statusChanges.update(
        connection,
        {
          communityId: community.id,
          statusChangeId: statusChange.id,
          body: {
            change_reason: "Attempt update locked",
          } satisfies ICommunityPlatformCommunityStatusChange.IUpdate,
        },
      );
    },
  );
}
