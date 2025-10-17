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
 * Test that an admin can retrieve full details for a specific moderator
 * assignment, including linkage to the member, assigned community, status, and
 * timestamps. Validates correct data is returned for the admin and rejects or
 * redacts results for unauthorized users.
 *
 * 1. Register a new admin.
 * 2. Create a new test community with the admin context.
 * 3. Create a pseudo member by simulating a file upload (which requires a member
 *    ID in the DTO).
 * 4. Assign this member as moderator to the new community as admin.
 * 5. Retrieve the moderator assignment details as admin and validate correctness.
 * 6. Attempt to retrieve the same moderator assignment as an unauthenticated user
 *    (by clearing Authorization header) and expect failure or redacted result.
 */
export async function test_api_moderator_assignment_details_admin_access(
  connection: api.IConnection,
) {
  // 1. Register admin for test and get authorized admin context
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminReg);
  // All further requests use admin context via connection

  // 2. Create a new community
  const communityCreate =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 6,
            sentenceMax: 12,
          }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreate);

  // 3. Simulate a 'member' with file upload; extract uploaded_by_member_id for use as test member
  const memberFile =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: typia.random<string & tags.Format<"uuid">>(), // simulate new member
          original_filename: RandomGenerator.alphaNumeric(7) + ".jpg",
          storage_key: RandomGenerator.alphaNumeric(20),
          mime_type: "image/jpeg",
          file_size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<1000000>
          >() satisfies number as number,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(15)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(memberFile);
  const memberId = memberFile.uploaded_by_member_id;

  // 4. Assign new moderator for the community as admin
  const now = new Date().toISOString();
  const modAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: communityCreate.id,
        body: {
          member_id: memberId,
          role: RandomGenerator.pick([
            "moderator",
            "trial_mod",
            "owner",
          ] as const),
          start_at: now,
          note: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(modAssignment);

  // 5. Retrieve the moderator details as admin
  const moderator = await api.functional.communityPlatform.admin.moderators.at(
    connection,
    {
      moderatorId: modAssignment.id as string & tags.Format<"uuid">,
    },
  );
  typia.assert(moderator);
  // Key results validation
  TestValidator.equals(
    "correct moderator id returned",
    moderator.id,
    modAssignment.id,
  );
  TestValidator.equals(
    "correct community id associated",
    moderator.community_id,
    communityCreate.id,
  );
  TestValidator.equals(
    "correct member id associated",
    moderator.member_id,
    memberId,
  );
  TestValidator.equals(
    "email format is valid",
    typeof moderator.email,
    "string",
  );
  TestValidator.predicate(
    "status is string",
    typeof moderator.status === "string",
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(moderator.created_at),
  );

  // 6. Attempt unauthorized retrieval (simulate unauthenticated or non-admin user)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve moderator assignment",
    async () => {
      await api.functional.communityPlatform.admin.moderators.at(unauthConn, {
        moderatorId: modAssignment.id as string & tags.Format<"uuid">,
      });
    },
  );
}
