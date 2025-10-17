import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate public and member access to a community banner's detail endpoint.
 *
 * 1. Register a new platform member and authenticate
 * 2. Create a new community as the member
 * 3. Upload a file (image) as the member
 * 4. Register a new community banner referencing the uploaded file
 * 5. Retrieve banner detail as the authenticated member and validate all metadata
 * 6. Retrieve banner detail as a guest (unauthenticated) and validate visibility,
 *    structure
 * 7. Deactivate (simulate deleting or marking inactive) the banner (when
 *    supported) and confirm unauthenticated access is blocked or redacted as
 *    per rules
 *
 * This ensures correct metadata and permissions for both member and guest
 * scenarios.
 */
export async function test_api_community_banner_detail_public_accessibility(
  connection: api.IConnection,
) {
  // 1. Register new member and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "securePassword!123",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  // 2. Create new community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 10,
    }),
    slug: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);
  // 3. Upload file for banner
  const fileUploadInput = {
    uploaded_by_member_id: member.id,
    original_filename: RandomGenerator.alphaNumeric(10) + ".png",
    storage_key: RandomGenerator.alphaNumeric(24),
    mime_type: "image/png",
    file_size_bytes: 123456,
    url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(24)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const file = await api.functional.communityPlatform.member.fileUploads.create(
    connection,
    {
      body: fileUploadInput,
    },
  );
  typia.assert(file);
  // 4. Register banner for community
  const bannerInput = {
    file_upload_id: file.id,
    order: 1,
    alt_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    active: true,
  } satisfies ICommunityPlatformCommunityBanner.ICreate;
  const banner =
    await api.functional.communityPlatform.moderator.communities.banners.create(
      connection,
      {
        communityId: community.id,
        body: bannerInput,
      },
    );
  typia.assert(banner);
  // 5. Retrieve banner as authenticated member
  const bannerDetailAsMember =
    await api.functional.communityPlatform.communities.banners.at(connection, {
      communityId: community.id,
      bannerId: banner.id,
    });
  typia.assert(bannerDetailAsMember);
  TestValidator.equals(
    "banner as member matches created banner",
    bannerDetailAsMember,
    banner,
    (key) => key === "created_at" || key === "updated_at",
  );
  // 6. Retrieve banner as guest (unauthenticated)
  const guestConnection: api.IConnection = { ...connection, headers: {} };
  const bannerDetailAsGuest =
    await api.functional.communityPlatform.communities.banners.at(
      guestConnection,
      {
        communityId: community.id,
        bannerId: banner.id,
      },
    );
  typia.assert(bannerDetailAsGuest);
  TestValidator.equals(
    "banner as guest matches banner",
    bannerDetailAsGuest,
    bannerDetailAsMember,
    (key) => key === "created_at" || key === "updated_at",
  );
  // 7. Banner deleted/inactive visibility check (simulate by setting active: false if possible)
  // (No delete/update endpoint in the available APIs, so we cannot deactivate or delete)
  // Thus, we skip banner deletion/inactive tests due to API limitations
}
