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
 * Validates moderator update permissions for community banner metadata.
 *
 * Workflow:
 *
 * 1. Register as member and create a community.
 * 2. Upload a banner image file as that member.
 * 3. Register as moderator for that community.
 * 4. As moderator, create an initial banner in that community using the uploaded
 *    file.
 * 5. Update the banner's metadata (alt_text, order, active status) via moderator
 *    API.
 * 6. Verify changes apply, and file reference remains unchanged.
 * 7. Optionally, validate no update is allowed to file_upload_id and audit
 *    fields/logs are updated.
 */
export async function test_api_moderator_update_community_banner_metadata(
  connection: api.IConnection,
) {
  // 1. Register as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community
  const communityName = RandomGenerator.alphaNumeric(8);
  const communitySlug = RandomGenerator.alphaNumeric(8);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator matches member",
    community.creator_member_id,
    member.id,
  );

  // 3. Upload a banner file as the member
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: member.id,
          original_filename: `${RandomGenerator.name(1)}.png`,
          storage_key: `s3://${RandomGenerator.alphaNumeric(16)}`,
          mime_type: "image/png",
          file_size_bytes: 100 * 1024,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);
  TestValidator.equals(
    "file uploader matches member",
    fileUpload.uploaded_by_member_id,
    member.id,
  );

  // 4. Register as moderator for the community
  const moderatorPassword = RandomGenerator.alphaNumeric(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: member.email, // only registered members may become moderators
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator is for the right community",
    moderator.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator corresponds with member",
    moderator.member_id,
    member.id,
  );

  // 5. As moderator, create the initial banner
  const banner =
    await api.functional.communityPlatform.moderator.communities.banners.create(
      connection,
      {
        communityId: community.id,
        body: {
          file_upload_id: fileUpload.id,
          order: 1,
          alt_text: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 10,
          }),
          active: true,
        } satisfies ICommunityPlatformCommunityBanner.ICreate,
      },
    );
  typia.assert(banner);
  TestValidator.equals(
    "banner belongs to the correct community",
    banner.community_id,
    community.id,
  );
  TestValidator.equals(
    "banner file reference matches",
    banner.file_upload_id,
    fileUpload.id,
  );
  TestValidator.predicate("banner is active", banner.active === true);

  // 6. Update the banner's metadata
  const updateRequest = {
    order: 2,
    alt_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 7,
      wordMax: 12,
    }),
    active: false,
  } satisfies ICommunityPlatformCommunityBanner.IUpdate;
  const updatedBanner =
    await api.functional.communityPlatform.moderator.communities.banners.update(
      connection,
      {
        communityId: community.id,
        bannerId: banner.id,
        body: updateRequest,
      },
    );
  typia.assert(updatedBanner);
  // 7. Validate changes applied, fileUploadId unchanged, audit fields updated
  TestValidator.equals(
    "alt_text was updated",
    updatedBanner.alt_text,
    updateRequest.alt_text,
  );
  TestValidator.equals(
    "order was updated",
    updatedBanner.order,
    updateRequest.order,
  );
  TestValidator.equals(
    "active was updated",
    updatedBanner.active,
    updateRequest.active,
  );
  TestValidator.equals(
    "file upload id remains the same",
    updatedBanner.file_upload_id,
    banner.file_upload_id,
  );
  TestValidator.notEquals(
    "updated_at reflects modification",
    updatedBanner.updated_at,
    banner.updated_at,
  );
}
