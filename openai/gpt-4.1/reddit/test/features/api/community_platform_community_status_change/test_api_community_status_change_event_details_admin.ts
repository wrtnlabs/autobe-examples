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
 * Test admin retrieval of community status change event details.
 *
 * 1. Register a new admin (auth/admin/join)
 * 2. Register a new member (auth/member/join)
 * 3. Member creates a new community
 * 4. Switch to admin session
 * 5. Admin changes status of created community, generating a status change event
 * 6. Admin fetches the status change event details by its id
 * 7. Confirm all audit fields: previous/new status, performed_by, reason, notes,
 *    created_at
 * 8. Negative: Try to fetch with non-existent statusChangeId (should error)
 * 9. Negative: Member tries to fetch status change details (should error)
 */
export async function test_api_community_status_change_event_details_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin#" + RandomGenerator.alphaNumeric(8);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "User$" + RandomGenerator.alphaNumeric(8);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Member creates a community
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  }); // ensure authentication context
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(6),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Switch to admin session
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  }); // re-authenticate for admin role

  // 5. Admin triggers status change (e.g., active -> banned)
  const statusChangeBody = {
    previous_status: community.status,
    new_status: "banned",
    change_reason: "policy_violation",
    notes: "Multiple spam complaints received.",
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

  // 6. Admin fetches specific status change event details
  const fetched =
    await api.functional.communityPlatform.admin.communities.statusChanges.at(
      connection,
      {
        communityId: community.id,
        statusChangeId: statusChange.id,
      },
    );
  typia.assert(fetched);

  // 7. Verify all returned fields for audit
  TestValidator.equals("correct status change id", fetched.id, statusChange.id);
  TestValidator.equals(
    "correct community reference",
    fetched.community_id,
    community.id,
  );
  TestValidator.equals(
    "performed_by matches admin",
    fetched.performed_by_id,
    admin.id,
  );
  TestValidator.equals(
    "previous_status matches",
    fetched.previous_status,
    statusChangeBody.previous_status,
  );
  TestValidator.equals(
    "new_status matches",
    fetched.new_status,
    statusChangeBody.new_status,
  );
  TestValidator.equals(
    "reason matches",
    fetched.change_reason,
    statusChangeBody.change_reason,
  );
  TestValidator.equals("notes matches", fetched.notes, statusChangeBody.notes);

  // 8. Negative: Try to fetch non-existent statusChangeId
  await TestValidator.error(
    "non-existent statusChangeId returns error",
    async () => {
      await api.functional.communityPlatform.admin.communities.statusChanges.at(
        connection,
        {
          communityId: community.id,
          statusChangeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 9. Negative: Member tries to fetch the event details
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  }); // switch context back to member
  await TestValidator.error(
    "member unauthorized to view status change details",
    async () => {
      await api.functional.communityPlatform.admin.communities.statusChanges.at(
        connection,
        {
          communityId: community.id,
          statusChangeId: statusChange.id,
        },
      );
    },
  );
}
