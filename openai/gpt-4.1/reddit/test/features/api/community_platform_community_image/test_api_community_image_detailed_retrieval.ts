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
 * Validate retrieval of community image details.
 *
 * 1. Register and login as moderator (receive moderator identity).
 * 2. Create a new community (as member-moderator context).
 * 3. Upload an image file (as the same member).
 * 4. As moderator, associate the image to the created community as an active icon
 *    with order/alt text.
 * 5. Retrieve the image details by public (non-auth) user, confirm metadata
 *    matches what was registered and file reference is correct.
 * 6. Update the image to become non-active, then confirm that access as public
 *    user is denied but access as moderator is allowed, and the metadata is
 *    correct.
 * 7. Attempt to access with missing or mismatched communityId/imageId (nonsense
 *    UUIDs) and confirm error is thrown.
 */
export async function test_api_community_image_detailed_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and login as moderator (later, will become community creator as well)
  const modEmail: string = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a community (as member)
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 12,
      wordMin: 3,
      wordMax: 9,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Upload an image file
  const fileUploadBody = {
    uploaded_by_member_id: community.creator_member_id,
    original_filename: RandomGenerator.name(1) + ".png",
    storage_key: RandomGenerator.alphaNumeric(18),
    mime_type: "image/png",
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<1000000>
    >() satisfies number as number,
    url: `https://fakebucket.com/${RandomGenerator.alphaNumeric(24)}.png` satisfies string as string,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const file = await api.functional.communityPlatform.member.fileUploads.create(
    connection,
    { body: fileUploadBody },
  );
  typia.assert(file);

  // 4. Register moderator (for that community)
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 5. Associate an image to the community as an active icon
  const imageInput: ICommunityPlatformCommunityImage.ICreate = {
    file_upload_id: file.id,
    image_type: "icon",
    order: 1 satisfies number as number,
    alt_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }) satisfies string as string,
    active: true,
  };
  const image =
    await api.functional.communityPlatform.moderator.communities.images.create(
      connection,
      {
        communityId: community.id,
        body: imageInput,
      },
    );
  typia.assert(image);

  // 6. Retrieve image as public (no auth, copy connection structure and clear headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const imageDetail =
    await api.functional.communityPlatform.communities.images.at(unauthConn, {
      communityId: community.id,
      imageId: image.id,
    });
  typia.assert(imageDetail);
  TestValidator.equals("image id matches", imageDetail.id, image.id);
  TestValidator.equals(
    "community id matches",
    imageDetail.community_id,
    community.id,
  );
  TestValidator.equals(
    "file upload id matches",
    imageDetail.file_upload_id,
    file.id,
  );
  TestValidator.equals(
    "image_type matches",
    imageDetail.image_type,
    imageInput.image_type,
  );
  TestValidator.equals("order matches", imageDetail.order, imageInput.order);
  TestValidator.equals(
    "alt_text matches",
    imageDetail.alt_text,
    imageInput.alt_text,
  );
  TestValidator.equals("active flag matches", imageDetail.active, true);

  // 7. Set image as inactive by creating a new image (simulate deactivation)
  // Only images created as active are visible to public; deactivation is not directly exposed, so simulate with additional image not active
  const inactiveImageIn = { ...imageInput, active: false, order: 2 }; // new order
  const inactiveImage =
    await api.functional.communityPlatform.moderator.communities.images.create(
      connection,
      {
        communityId: community.id,
        body: inactiveImageIn,
      },
    );
  typia.assert(inactiveImage);

  // Retrieval as public should fail for non-active image
  await TestValidator.error(
    "public cannot access non-active image",
    async () => {
      await api.functional.communityPlatform.communities.images.at(unauthConn, {
        communityId: community.id,
        imageId: inactiveImage.id,
      });
    },
  );
  // But as moderator, can access
  const asModImage =
    await api.functional.communityPlatform.communities.images.at(connection, {
      communityId: community.id,
      imageId: inactiveImage.id,
    });
  typia.assert(asModImage);
  TestValidator.equals(
    "inactive image id matches",
    asModImage.id,
    inactiveImage.id,
  );
  TestValidator.equals("inactive image active flag", asModImage.active, false);

  // 8. Mismatched IDs cause error
  const badId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("missing community id should error", async () => {
    await api.functional.communityPlatform.communities.images.at(unauthConn, {
      communityId: badId,
      imageId: image.id,
    });
  });
  await TestValidator.error("missing image id should error", async () => {
    await api.functional.communityPlatform.communities.images.at(unauthConn, {
      communityId: community.id,
      imageId: badId,
    });
  });
}
