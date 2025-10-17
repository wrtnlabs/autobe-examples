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
 * Validate admin-driven community status change/audit log creation.
 *
 * 1. Member registers and creates a new community
 * 2. Admin registers with unique credentials
 * 3. Admin performs community status change: e.g. active -> banned, using valid
 *    status codes, including optional reason/notes
 * 4. Validate returned audit record: community ID, performed_by_id,
 *    previous_status, new_status, (optional) reason, notes, created_at. Confirm
 *    values and type.
 * 5. Enforce permissions: member CANNOT perform status changes (should fail).
 * 6. Attempt status change to an invalid value (e.g., 'superbanned') and confirm
 *    error.
 * 7. Attempt to change status for a non-existent community (random UUID) and
 *    confirm error.
 * 8. (Optional) Attempt to change status on soft-deleted community and confirm
 *    error if soft-delete supported.
 */
export async function test_api_community_status_change_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a member and create community as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPass123$",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph(),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(createdCommunity);

  // 2. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass456$",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Admin performs community status change
  // Change from 'active' to 'banned' with reason/notes
  const statusChangeBody = {
    previous_status: createdCommunity.status,
    new_status: "banned",
    performed_by_id: admin.id,
    change_reason: "Rule violation",
    notes: "Test ban for inappropriate behavior",
  } satisfies ICommunityPlatformCommunityStatusChange.ICreate;

  const statusChange =
    await api.functional.communityPlatform.admin.communities.statusChanges.create(
      connection,
      {
        communityId: createdCommunity.id,
        body: statusChangeBody,
      },
    );
  typia.assert(statusChange);
  TestValidator.equals(
    "community ID matches",
    statusChange.community_id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "performed_by_id matches",
    statusChange.performed_by_id,
    admin.id,
  );
  TestValidator.equals(
    "previous_status matches",
    statusChange.previous_status,
    createdCommunity.status,
  );
  TestValidator.equals(
    "new_status is banned",
    statusChange.new_status,
    "banned",
  );
  TestValidator.equals(
    "change_reason correct",
    statusChange.change_reason,
    "Rule violation",
  );
  TestValidator.equals(
    "notes correct",
    statusChange.notes,
    "Test ban for inappropriate behavior",
  );

  // 5. Member cannot perform status change (should fail)
  await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OtherPass789$",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  // Attempt status change as member (not admin) -- Expect error
  await TestValidator.error(
    "member cannot perform community status change",
    async () => {
      await api.functional.communityPlatform.admin.communities.statusChanges.create(
        connection,
        {
          communityId: createdCommunity.id,
          body: {
            previous_status: createdCommunity.status,
            new_status: "archived",
            performed_by_id: member.id,
          } satisfies ICommunityPlatformCommunityStatusChange.ICreate,
        },
      );
    },
  );

  // 6. Attempt invalid status value
  await TestValidator.error("invalid status value should fail", async () => {
    await api.functional.communityPlatform.admin.communities.statusChanges.create(
      connection,
      {
        communityId: createdCommunity.id,
        body: {
          previous_status: createdCommunity.status,
          new_status: "superbanned",
          performed_by_id: admin.id,
        } satisfies ICommunityPlatformCommunityStatusChange.ICreate,
      },
    );
  });

  // 7. Attempt to update non-existent community
  await TestValidator.error("non-existent community should fail", async () => {
    await api.functional.communityPlatform.admin.communities.statusChanges.create(
      connection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          previous_status: "active",
          new_status: "banned",
          performed_by_id: admin.id,
        } satisfies ICommunityPlatformCommunityStatusChange.ICreate,
      },
    );
  });
  // (8. Soft-deleted community case omitted if soft delete unsupported)
}
