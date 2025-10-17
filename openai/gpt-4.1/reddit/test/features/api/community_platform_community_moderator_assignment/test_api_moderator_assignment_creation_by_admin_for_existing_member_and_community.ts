import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Verify that admin can assign a platform member as a moderator to a community.
 *
 * 1. Register a platform member
 * 2. Member uploads a file to establish presence/activity
 * 3. Register and login as an admin
 * 4. Admin creates a new community
 * 5. Admin assigns the member as a moderator to the new community
 * 6. Validate role uniqueness/assignment quota/eligible member business logic
 */
export async function test_api_moderator_assignment_creation_by_admin_for_existing_member_and_community(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member id uuid",
    typeof member.id === "string" && member.id.length > 0,
  );

  // Step 2: Member uploads a file
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: member.id,
          original_filename:
            RandomGenerator.paragraph({ sentences: 2 }) + ".jpg",
          storage_key: RandomGenerator.alphaNumeric(24),
          mime_type: "image/jpeg",
          file_size_bytes: 9212,
          url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(24),
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);
  TestValidator.equals(
    "file upload belonged to correct member",
    fileUpload.uploaded_by_member_id,
    member.id,
  );

  // Step 3: Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin superuser flag false", admin.superuser, false);

  // Step 4: Admin creates a new community
  const communityName = RandomGenerator.paragraph({ sentences: 2 });
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const communityDescription = RandomGenerator.content({ paragraphs: 2 });
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: communityTitle,
          description: communityDescription,
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community slug matches", community.slug, communitySlug);

  // Step 5: Admin assigns member as moderator
  const now = new Date();
  const startAt = now.toISOString();
  const role = "moderator";
  const note = RandomGenerator.paragraph({ sentences: 3 });
  const assignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          role,
          start_at: startAt,
          note,
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // Check key fields match
  TestValidator.equals("assignment member_id", assignment.member_id, member.id);
  TestValidator.equals(
    "assignment community_id",
    assignment.community_id,
    community.id,
  );
  TestValidator.equals("assignment role", assignment.role, role);
  TestValidator.equals("assignment note", assignment.note, note);
  TestValidator.equals(
    "assignment end_at should be null or undefined (not ended)",
    assignment.end_at,
    null,
  );

  // Step 6: Role uniqueness/assignment quota/eligibility check (negative test)
  await TestValidator.error(
    "cannot assign same member as moderator with same role again",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
        connection,
        {
          communityId: community.id,
          body: {
            member_id: member.id,
            role,
            start_at: startAt,
            note: "duplicate assignment test",
          } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
        },
      );
    },
  );
}
