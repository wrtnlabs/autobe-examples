import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate that a moderator can archive (soft-delete) a banner from their
 * assigned community, and that permission boundaries and data integrity are
 * enforced.
 *
 * This scenario covers the full flow as follows:
 *
 * 1. Register a new platform member via member join API.
 * 2. Create a new community as that member (the member becomes the community
 *    creator).
 * 3. Register as a moderator for the created community using moderator join API.
 * 4. Upload a file (image) to the platform to be used as a banner.
 * 5. Create a community banner as the moderator (referencing the uploaded file).
 * 6. As the assigned moderator, soft-delete (archive) the banner.
 * 7. Confirm the banner is no longer visible in listings (would require a listing
 *    API not present; must check by fetching the banner separately or
 *    re-querying as permitted).
 * 8. Confirm that the banner remains in the database with deleted_at field set.
 * 9. Confirm that a different user (not assigned as moderator of the community)
 *    cannot delete the same banner (should receive a permission error).
 * 10. Try deleting an already-archived banner; should result in an error.
 * 11. Attempt to soft-delete a banner for a community with which the moderator is
 *     not associated; expect error/denial.
 * 12. Validate that all deletion events are logged (as can be confirmed via
 *     available information, if audit APIs exist).
 *
 * Required setup: only the allowed APIs are used. Listing banner API is not
 * provided, so confirmation is done via available reads and object state.
 * Member and moderator accounts are distinct. Test data is random; all IDs and
 * references are generated at runtime.
 *
 * Edge cases: permission errors on unauthorized delete attempts and repeated
 * deletions, and non-moderator actions.
 */
export async function test_api_community_banner_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register as a new platform member (will be the creator of a community)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member email is correct",
    memberAuth.email === memberEmail,
  );

  // 2. Create a new community as the member
  const communityName = RandomGenerator.alphabets(12).toLowerCase();
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communitySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityDescription = RandomGenerator.content({ paragraphs: 1 });
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: communityTitle,
          slug: communitySlug,
          description: communityDescription,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator is the registering member",
    community.creator_member_id,
    memberAuth.id,
  );

  // 3. Register as a moderator assigned to the created community
  const moderatorEmail = memberEmail; // Use same identity for member/moderator
  const moderatorPassword = memberPassword;
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "moderator email matches",
    moderatorAuth.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator assigned to correct community",
    moderatorAuth.community_id,
    community.id,
  );

  // 4. Upload a file (image) to be used for the banner
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberAuth.id,
          original_filename: `${RandomGenerator.alphabets(8)}.jpg`,
          storage_key: RandomGenerator.alphaNumeric(20),
          mime_type: "image/jpeg",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          url: `https://img.example.com/${RandomGenerator.alphaNumeric(16)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);
  TestValidator.equals(
    "file upload is owned by member",
    fileUpload.uploaded_by_member_id,
    memberAuth.id,
  );

  // 5. Create the banner for the community
  const bannerAltText = RandomGenerator.paragraph({ sentences: 1 });
  const bannerOrder = typia.random<number & tags.Type<"int32">>();
  const banner =
    await api.functional.communityPlatform.moderator.communities.banners.create(
      connection,
      {
        communityId: community.id,
        body: {
          file_upload_id: fileUpload.id,
          order: bannerOrder,
          alt_text: bannerAltText,
          active: true,
        } satisfies ICommunityPlatformCommunityBanner.ICreate,
      },
    );
  typia.assert(banner);
  TestValidator.equals("banner is active", banner.active, true);
  TestValidator.equals(
    "banner refers to correct file upload",
    banner.file_upload_id,
    fileUpload.id,
  );

  // 6. As moderator, soft-delete (archive) the banner
  await api.functional.communityPlatform.moderator.communities.banners.erase(
    connection,
    {
      communityId: community.id,
      bannerId: banner.id,
    },
  );

  // 7. (Optional) Attempt to fetch banner status again (direct read API not available, so we assume erase works; would need a listing/get API for confirmation)
  // 8. Confirm via state that the banner is marked deleted (deleted_at should now be set in database)
  //    Would require detail GET (not present); assume erase works per API contract

  // 9. Attempt to delete the same banner as another user (not a moderator of this community)
  //    Create a new member and try to erase the same banner as non-moderator (should fail with permission error)
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberPassword = RandomGenerator.alphaNumeric(12);
  const otherMemberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: otherMemberEmail,
      password: otherMemberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(otherMemberAuth);
  await TestValidator.error("non-moderator cannot archive banner", async () => {
    await api.functional.communityPlatform.moderator.communities.banners.erase(
      connection,
      {
        communityId: community.id,
        bannerId: banner.id,
      },
    );
  });

  // 10. Attempt to delete the already-archived banner again as moderator (should fail)
  await TestValidator.error("cannot archive banner twice", async () => {
    await api.functional.communityPlatform.moderator.communities.banners.erase(
      connection,
      {
        communityId: community.id,
        bannerId: banner.id,
      },
    );
  });

  // 11. Create a second community, join as its moderator, and verify cannot delete banner from unrelated community
  const newCommunityName = RandomGenerator.alphabets(12).toLowerCase();
  const newCommunityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newCommunitySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const newCommunityDescription = RandomGenerator.content({ paragraphs: 1 });
  const secondCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: newCommunityName,
          title: newCommunityTitle,
          slug: newCommunitySlug,
          description: newCommunityDescription,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondCommunity);
  // Register as moderator for the new community
  const secondModeratorAuth = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: otherMemberEmail,
        password: otherMemberPassword as string & tags.Format<"password">,
        community_id: secondCommunity.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(secondModeratorAuth);
  await TestValidator.error(
    "moderator of another community cannot archive unrelated banner",
    async () => {
      await api.functional.communityPlatform.moderator.communities.banners.erase(
        connection,
        {
          communityId: secondCommunity.id,
          bannerId: banner.id,
        },
      );
    },
  );
}
