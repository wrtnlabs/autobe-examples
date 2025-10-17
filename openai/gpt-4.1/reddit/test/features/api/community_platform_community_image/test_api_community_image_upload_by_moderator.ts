import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator image upload for a community (icon type).
 *
 * Steps:
 *
 * 1. Create a new community as a member
 * 2. Register and authenticate as moderator for that community
 * 3. Upload a file as image (valid PNG/JPEG with reasonable size)
 * 4. Associate file as image to the community via moderator endpoint, specifying
 *    type/order/alt
 * 5. Confirm the returned record matches submission and image is active
 * 6. Attempt upload with excessive file size (expect error)
 * 7. Attempt to upload more images than allowed (simulate quota error)
 * 8. Attempt upload with wrong moderator (different community)
 */
export async function test_api_community_image_upload_by_moderator(
  connection: api.IConnection,
) {
  // Create a new community (step 1)
  const createCommunityBody = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content(),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(community);

  // Register and login as moderator for this community (step 2)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "1234",
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // Member ID to use for file upload
  const uploaded_by_member_id = moderator.member_id;

  // Upload a valid file (PNG, small size, valid url and key) (step 3)
  const validFileUploadBody = {
    uploaded_by_member_id,
    original_filename: RandomGenerator.alphaNumeric(8) + ".png",
    storage_key: RandomGenerator.alphaNumeric(30),
    mime_type: "image/png",
    file_size_bytes: 51200, // 50 KB
    url: `https://files.test/${RandomGenerator.alphaNumeric(12)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: validFileUploadBody },
    );
  typia.assert(fileUpload);

  // Build the community image create body (icon type)
  const createCommunityImageBody = {
    file_upload_id: fileUpload.id,
    image_type: "icon",
    order: 1,
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
  } satisfies ICommunityPlatformCommunityImage.ICreate;

  // Moderator uploads the image (step 4)
  const communityImage =
    await api.functional.communityPlatform.moderator.communities.images.create(
      connection,
      {
        communityId: community.id,
        body: createCommunityImageBody,
      },
    );
  typia.assert(communityImage);
  // Validate returned image matches request
  TestValidator.equals(
    "linked image file_upload_id",
    communityImage.file_upload_id,
    createCommunityImageBody.file_upload_id,
  );
  TestValidator.equals(
    "linked community id",
    communityImage.community_id,
    community.id,
  );
  TestValidator.equals(
    "image type",
    communityImage.image_type,
    createCommunityImageBody.image_type,
  );
  TestValidator.equals(
    "order",
    communityImage.order,
    createCommunityImageBody.order,
  );
  TestValidator.equals(
    "alt text",
    communityImage.alt_text,
    createCommunityImageBody.alt_text,
  );
  TestValidator.equals("active flag", communityImage.active, true);

  // Upload image with excessive file size (step 6, expect error)
  const hugeFileUploadBody = {
    ...validFileUploadBody,
    original_filename: RandomGenerator.alphaNumeric(8) + ".jpg",
    storage_key: RandomGenerator.alphaNumeric(30),
    mime_type: "image/jpeg",
    file_size_bytes: 80_000_000, // 80 MB, likely over API or business quota
    url: `https://files.test/${RandomGenerator.alphaNumeric(12)}.jpg`,
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const hugeFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: hugeFileUploadBody },
    );
  typia.assert(hugeFileUpload);
  await TestValidator.error(
    "community image upload fails on file size/quota",
    async () => {
      await api.functional.communityPlatform.moderator.communities.images.create(
        connection,
        {
          communityId: community.id,
          body: {
            file_upload_id: hugeFileUpload.id,
            image_type: "icon",
            order: 2,
            alt_text: RandomGenerator.paragraph({ sentences: 2 }),
            active: true,
          } satisfies ICommunityPlatformCommunityImage.ICreate,
        },
      );
    },
  );

  // Attempt upload with wrong moderator permission by switching to fake community (step 8)
  // Create a different community and moderator
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  const otherModEmail = typia.random<string & tags.Format<"email">>();
  const otherModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherModEmail,
      password: "1234",
      community_id: otherCommunity.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(otherModerator);
  // try uploading on the first community using wrong moderator (should fail: permission)
  await TestValidator.error(
    "permission denied on different moderator",
    async () => {
      await api.functional.communityPlatform.moderator.communities.images.create(
        connection,
        {
          communityId: community.id, // but logged in as otherModerator
          body: {
            file_upload_id: fileUpload.id,
            image_type: "background",
            order: 3,
            alt_text: RandomGenerator.paragraph({ sentences: 2 }),
            active: true,
          } satisfies ICommunityPlatformCommunityImage.ICreate,
        },
      );
    },
  );

  // Optionally, simulate quota (business logic: assume platform allows 1 icon per community)
  // Try uploading second icon to the same community
  await TestValidator.error(
    "duplicate icon type image exceeds quota",
    async () => {
      await api.functional.communityPlatform.moderator.communities.images.create(
        connection,
        {
          communityId: community.id,
          body: {
            file_upload_id: fileUpload.id,
            image_type: "icon",
            order: 2,
            alt_text: RandomGenerator.paragraph({ sentences: 2 }),
            active: true,
          } satisfies ICommunityPlatformCommunityImage.ICreate,
        },
      );
    },
  );
}
