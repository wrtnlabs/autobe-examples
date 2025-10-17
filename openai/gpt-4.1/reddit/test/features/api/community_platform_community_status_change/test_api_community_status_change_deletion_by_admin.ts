import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusChange";

/**
 * Validate admin deletion of a community status change (audit) event.
 *
 * 1. Register as platform administrator using /auth/admin/join to obtain necessary
 *    privileges and session.
 * 2. Create a new community (as prerequisite for status change event) using
 *    /communityPlatform/member/communities.
 * 3. Create a new status change audit event for that community using
 *    /communityPlatform/admin/communities/:communityId/statusChanges.
 * 4. Delete the created status change as admin via
 *    /communityPlatform/admin/communities/:communityId/statusChanges/:statusChangeId.
 * 5. Confirm deletion: ensure it is no longer present (a typical read/list
 *    endpoint would 404/not find it, but since only deletion endpoint is
 *    present: negative re-delete test).
 * 6. Attempt to delete a non-existent status change (random UUID for
 *    statusChangeId): expect error.
 * 7. (Permission) Try deleting as a non-admin account (simulate by clearing
 *    Authorization in connection): expect error.
 */
export async function test_api_community_status_change_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin for privileged access
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create new community to target with status change
  const communityCreation = {
    name: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 5,
      wordMax: 12,
    }),
    slug: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreation,
      },
    );
  typia.assert(community);

  // 3. Create status change audit event as admin
  const statusChangeBody = {
    previous_status: "active",
    new_status: "banned",
    change_reason: "policy_violation",
    notes: "Automated test: community banned due to violation.",
    performed_by_id: admin.id,
  } satisfies ICommunityPlatformCommunityStatusChange.ICreate;
  const statusChange =
    await api.functional.communityPlatform.admin.communities.statusChanges.create(
      connection,
      {
        communityId: community.id,
        body: statusChangeBody,
      },
    );
  typia.assert(statusChange);

  // 4. Delete the status change entry as admin
  await api.functional.communityPlatform.admin.communities.statusChanges.erase(
    connection,
    {
      communityId: community.id,
      statusChangeId: statusChange.id,
    },
  );

  // 5. Negative test: Try to re-delete (should error)
  await TestValidator.error(
    "re-delete already deleted status change should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.statusChanges.erase(
        connection,
        {
          communityId: community.id,
          statusChangeId: statusChange.id,
        },
      );
    },
  );

  // 6. Error: Try to delete non-existent status change id for this community
  await TestValidator.error(
    "deletion of non-existent status change should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.statusChanges.erase(
        connection,
        {
          communityId: community.id,
          statusChangeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Permission: Try to delete as non-admin (simulate as unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion attempt should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.statusChanges.erase(
        unauthConn,
        {
          communityId: community.id,
          statusChangeId: statusChange.id,
        },
      );
    },
  );
}
