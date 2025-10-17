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
 * Validate that only an authenticated community moderator can create a
 * community banner, properly linking all resource dependencies and verifying
 * permissions.
 *
 * Workflow:
 *
 * 1. Register as a member (unique email/password)
 * 2. Create a new community as that member (assign unique name/slug, title)
 * 3. Upload a file as the member, simulating an image to serve as banner
 * 4. Register as the moderator of this community, using the member's credentials
 *    and linking to the new community
 * 5. As moderator, create a community banner using the uploaded file reference
 *    (file_upload_id)
 * 6. Validate that the banner was created, is active, references correct community
 *    and file, and wanted metadata is correct
 * 7. Attempt banner creation as a regular member and expect permission denial
 * 8. Attempt with invalid community/file_upload_id and expect errors
 */
export async function test_api_community_banner_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      },
    });
  typia.assert(memberAuth);

  // 2. Create a new community as this member
  const communityReq = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityReq },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator_member_id matches",
    community.creator_member_id,
    memberAuth.id,
  );

  // 3. Upload a file as this member
  const bannerUploadReq = {
    uploaded_by_member_id: memberAuth.id,
    original_filename: RandomGenerator.alphaNumeric(8) + ".png",
    storage_key: RandomGenerator.alphaNumeric(32),
    mime_type: "image/png",
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<2_000_000>
    >(),
    url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(24),
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const bannerFile: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: bannerUploadReq },
    );
  typia.assert(bannerFile);
  TestValidator.equals(
    "file uploaded_by_member_id",
    bannerFile.uploaded_by_member_id,
    memberAuth.id,
  );

  // 4. Register as moderator for this community
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword as string & tags.Format<"password">,
        community_id: community.id,
      },
    });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "moderator community_id matches",
    moderatorAuth.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator member_id matches",
    moderatorAuth.member_id,
    memberAuth.id,
  );

  // 5. As moderator, create a banner for the community
  const createBannerReq = {
    file_upload_id: bannerFile.id,
    order: 1,
    active: true,
    alt_text: "Community main banner.",
  } satisfies ICommunityPlatformCommunityBanner.ICreate;
  const banner: ICommunityPlatformCommunityBanner =
    await api.functional.communityPlatform.moderator.communities.banners.create(
      connection,
      {
        communityId: community.id,
        body: createBannerReq,
      },
    );
  typia.assert(banner);
  TestValidator.equals(
    "banner community_id matches",
    banner.community_id,
    community.id,
  );
  TestValidator.equals(
    "banner file_upload_id matches",
    banner.file_upload_id,
    bannerFile.id,
  );
  TestValidator.equals("banner is active", banner.active, true);
  TestValidator.equals(
    "banner alt_text",
    banner.alt_text,
    createBannerReq.alt_text,
  );

  // 6. Error: Only moderator may create a banner (try as regular member)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "member cannot create community banner",
    async () => {
      await api.functional.communityPlatform.moderator.communities.banners.create(
        unauthConn,
        {
          communityId: community.id,
          body: createBannerReq,
        },
      );
    },
  );

  // 7. Error: Using wrong file_upload_id should fail
  await TestValidator.error("invalid file_upload_id rejected", async () => {
    await api.functional.communityPlatform.moderator.communities.banners.create(
      connection,
      {
        communityId: community.id,
        body: {
          ...createBannerReq,
          file_upload_id: typia.random<string & tags.Format<"uuid">>(), // random UUID not actually uploaded
        },
      },
    );
  });

  // 8. Error: Using wrong communityId should fail
  await TestValidator.error("invalid communityId rejected", async () => {
    await api.functional.communityPlatform.moderator.communities.banners.create(
      connection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(), // not actually created
        body: createBannerReq,
      },
    );
  });
}
