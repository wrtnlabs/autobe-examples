import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate that non-moderators (ordinary member or platform admin) cannot
 * delete (erase) community images.
 *
 * 1. Member creates a new community and performs file upload
 * 2. Member is registered as moderator for that community
 * 3. Admin registers for platform admin role
 * 4. Moderator creates a community image (uses uploaded file)
 * 5. Switch to admin account, attempt to delete the community image. Confirm
 *    forbidden.
 * 6. Switch to original member (not in moderator context), attempt to delete the
 *    image. Confirm forbidden.
 * 7. Optionally, confirm the image has not been deleted.
 */
export async function test_api_community_moderator_image_erase_denied_to_non_moderators(
  connection: api.IConnection,
) {
  // 1. Member creates a new community
  const communitySeed = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(7),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communitySeed },
    );
  typia.assert(community);

  // For member ID, assume it's in creator_member_id
  const memberId = community.creator_member_id;

  // 2. Member uploads a file
  const fileUploadSeed = {
    uploaded_by_member_id: memberId,
    original_filename: RandomGenerator.alphaNumeric(12) + ".png",
    storage_key: RandomGenerator.alphaNumeric(24),
    mime_type: "image/png",
    file_size_bytes: 8000,
    url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(24)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: fileUploadSeed },
    );
  typia.assert(fileUpload);

  // 3. Register member as moderator
  const moderatorJoinSeed = {
    email: RandomGenerator.alphaNumeric(7) + "@mail.com",
    password: RandomGenerator.alphaNumeric(12),
    community_id: community.id,
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinSeed,
    });
  typia.assert(moderatorAuth);

  // 4. Admin registration
  const adminJoinSeed = {
    email: RandomGenerator.alphaNumeric(7) + "@admin.com",
    password: RandomGenerator.alphaNumeric(12),
    superuser: true,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuthorized: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinSeed });
  typia.assert(adminAuthorized);

  // 5. Moderator creates community image
  const communityImageSeed = {
    file_upload_id: fileUpload.id,
    image_type: "icon",
    active: true,
  } satisfies ICommunityPlatformCommunityImage.ICreate;
  const communityImage: ICommunityPlatformCommunityImage =
    await api.functional.communityPlatform.moderator.communities.images.create(
      connection,
      { communityId: community.id, body: communityImageSeed },
    );
  typia.assert(communityImage);

  // 6. Switch to admin (will use admin's token set by join)
  // Attempt to erase image as admin
  await TestValidator.error(
    "admin should not be able to erase community image",
    async () => {
      await api.functional.communityPlatform.moderator.communities.images.erase(
        connection,
        { communityId: community.id, imageId: communityImage.id },
      );
    },
  );

  // 7. Switch back to member (non-moderator context)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "ordinary member should not be able to erase community image",
    async () => {
      await api.functional.communityPlatform.moderator.communities.images.erase(
        unauthConn,
        { communityId: community.id, imageId: communityImage.id },
      );
    },
  );
}
