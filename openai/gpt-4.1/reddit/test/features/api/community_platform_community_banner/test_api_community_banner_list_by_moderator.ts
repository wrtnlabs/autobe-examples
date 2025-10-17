import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBanner";

/**
 * Validates that a community moderator can retrieve a paginated and filtered
 * list of banner images for their community only, with all banner properties
 * and permissions enforced. Follows the flow:
 *
 * 1. Register a new member and (auto)login
 * 2. Create a community — member becomes moderator
 * 3. Upload a file as the banner image
 * 4. Register the banner by associating the file with the community, adding
 *    metadata (alt text/order/status)
 * 5. List banners for the community with paging/filter
 * 6. Confirm the banner appears in the result and metadata matches input
 * 7. Confirm metadata: id, community_id, file_upload_id, order, alt_text, active,
 *    timestamps
 * 8. Confirm the moderator cannot see banners of another (unrelated) community
 *    (permissions)
 */
export async function test_api_community_banner_list_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a member and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = "StrongPassword123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community (become moderator)
  const communityInput = {
    name: RandomGenerator.alphabets(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);

  // 3. Upload a file as the banner image
  const fileInput = {
    uploaded_by_member_id: community.creator_member_id,
    original_filename: RandomGenerator.name() + ".png",
    storage_key: RandomGenerator.alphaNumeric(16),
    mime_type: "image/png",
    file_size_bytes: typia.random<number & tags.Type<"int32">>(),
    url:
      "https://test.example.com/" + RandomGenerator.alphaNumeric(12) + ".png",
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: fileInput },
    );
  typia.assert(fileUpload);

  // 4. Register banner with metadata (order, alt text, active)
  const bannerMeta = {
    file_upload_id: fileUpload.id,
    order: 1,
    alt_text: "Community hero image",
    active: true,
  } satisfies ICommunityPlatformCommunityBanner.ICreate;
  const banner =
    await api.functional.communityPlatform.moderator.communities.banners.create(
      connection,
      {
        communityId: community.id,
        body: bannerMeta,
      },
    );
  typia.assert(banner);

  // 5. List banners for the community with filter on file_upload_id, alt_text, active
  const searchReq = {
    community_id: community.id,
    file_upload_id: fileUpload.id,
    alt_text: "Community hero image",
    active: true,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunityBanner.IRequest;
  const bannerPage =
    await api.functional.communityPlatform.moderator.communities.banners.index(
      connection,
      {
        communityId: community.id,
        body: searchReq,
      },
    );
  typia.assert(bannerPage);

  // 6. Confirm result includes registered banner and fields match
  const found = bannerPage.data.find((b) => b.id === banner.id);
  typia.assertGuard(found!);
  TestValidator.equals(
    "result includes the created banner for correct community",
    found.community_id,
    community.id,
  );
  TestValidator.equals(
    "banner has correct file_upload_id",
    found.file_upload_id,
    fileUpload.id,
  );
  TestValidator.equals(
    "banner meta alt_text matches",
    found.alt_text,
    bannerMeta.alt_text,
  );
  TestValidator.equals(
    "banner meta order matches",
    found.order,
    bannerMeta.order,
  );
  TestValidator.equals("banner active", found.active, true);
  TestValidator.equals("banner id matches", found.id, banner.id);
  TestValidator.predicate(
    "banner created_at/updated_at are strings",
    typeof found.created_at === "string" &&
      typeof found.updated_at === "string",
  );

  // 7. Edge case: Try retrieving banners of another community as this moderator (should not be allowed/empty result)
  // Create a second community as a different user
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      email: otherEmail,
      password: "ImpostorPass987!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(otherMember);
  // Switch back to original member (simulate role context)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  // That other member creates a community
  const otherCommunityInput = {
    name: RandomGenerator.alphabets(9),
    title: "Unrelated Community",
    description: "Should not be visible to original moderator",
    slug: RandomGenerator.alphaNumeric(13),
  } satisfies ICommunityPlatformCommunity.ICreate;
  // Switch to the other member context
  await api.functional.auth.member.join(connection, {
    body: {
      email: otherEmail,
      password: "ImpostorPass987!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: otherCommunityInput },
    );
  typia.assert(otherCommunity);
  // Switch back to original moderator context
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  // Try to retrieve banners for unrelated community (should be empty or forbidden)
  const otherBannerList =
    await api.functional.communityPlatform.moderator.communities.banners.index(
      connection,
      {
        communityId: otherCommunity.id,
        body: {
          community_id: otherCommunity.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBanner.IRequest,
      },
    );
  typia.assert(otherBannerList);
  TestValidator.equals(
    "should not see banners of unrelated community",
    otherBannerList.data.length,
    0,
  );
}
