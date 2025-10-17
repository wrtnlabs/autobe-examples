import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * E2E scenario covering admin update of a moderator assignment.
 *
 * 1. Register a new admin; assert authorization and admin privileges are granted
 *    to this user.
 * 2. (Optionally) authenticate as admin if required by platform.
 * 3. As a member (user), create a community with a unique slug and title.
 * 4. Create/provision a member account by simulating a platform file upload
 *    (establishes the member's existence in the system).
 * 5. As admin, assign the member as moderator of the new community via the
 *    moderatorAssignments.create endpoint; retrieve the moderatorId from the
 *    result.
 * 6. As admin, perform a moderator assignment update via moderators.update:
 *
 *    - Change the moderator's status from 'active' to 'suspended' (simulate a
 *         suspension action).
 *    - Optionally update the email to a new value and set/clear deleted_at field
 *         (test audit metadata update logic).
 *    - Assert all changed fields reflect in the returned moderator entity; check
 *         timestamps are updated; verify only admin can perform the operation.
 * 7. Error scenario A: Attempt to update a moderator assignment with a random
 *    invalid moderatorId as admin; assert error is thrown.
 * 8. Error scenario B: Attempt the same update as a non-admin (skip admin
 *    authentication step / simulate non-privileged connection); assert
 *    failure.
 */
export async function test_api_moderator_assignment_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate("admin is superuser", admin.superuser === true);

  // 2. Authenticate as admin is implied by SDK headers auto-set via join.

  // 3. As a member, create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2).replace(/ /g, "_"),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create/provision a member entity via file upload
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: typia.random<string & tags.Format<"uuid">>(),
          original_filename: `${RandomGenerator.alphaNumeric(10)}.png`,
          storage_key: RandomGenerator.alphaNumeric(32),
          mime_type: "image/png",
          file_size_bytes: 1024,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(24)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 5. Assign the member as moderator via admin API (use fileUpload.uploaded_by_member_id as member reference)
  const now = new Date();
  const modAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: fileUpload.uploaded_by_member_id,
          role: "moderator",
          start_at: now.toISOString(),
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(modAssignment);

  // 6. As admin, perform update on moderator assignment (e.g., suspend, change email)
  const newEmail = typia.random<string & tags.Format<"email">>();
  const suspended =
    await api.functional.communityPlatform.admin.moderators.update(connection, {
      moderatorId: modAssignment.id,
      body: {
        status: "suspended",
        email: newEmail,
      } satisfies ICommunityPlatformModerator.IUpdate,
    });
  typia.assert(suspended);
  TestValidator.equals(
    "status updated to suspended",
    suspended.status,
    "suspended",
  );
  TestValidator.equals("email updated", suspended.email, newEmail);
  TestValidator.equals(
    "moderator id unchanged",
    suspended.id,
    modAssignment.id,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    suspended.updated_at !== modAssignment.updated_at,
  );

  // 7. Try updating a moderator assignment with random (invalid) moderatorId, expect error
  await TestValidator.error(
    "updating non-existent moderator assignment fails",
    async () => {
      await api.functional.communityPlatform.admin.moderators.update(
        connection,
        {
          moderatorId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "suspended",
          } satisfies ICommunityPlatformModerator.IUpdate,
        },
      );
    },
  );

  // 8. Attempt to update as a non-admin (simulate a connection with no admin auth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot update moderator assignment",
    async () => {
      await api.functional.communityPlatform.admin.moderators.update(
        unauthConn,
        {
          moderatorId: modAssignment.id,
          body: {
            status: "active",
          } satisfies ICommunityPlatformModerator.IUpdate,
        },
      );
    },
  );
}
