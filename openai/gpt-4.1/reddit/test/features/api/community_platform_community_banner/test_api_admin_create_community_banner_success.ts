import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate that an admin can create a new banner for an existing community by
 * referencing a file uploaded by a member.
 *
 * Workflow:
 *
 * 1. Register as admin.
 * 2. Register as member.
 * 3. As member, create a community.
 * 4. As member, upload a file for banner use.
 * 5. As admin, create a community banner by referencing the uploaded file and
 *    specifying all required metadata.
 * 6. Verify that the banner metadata is correct and that it is associated with
 *    both the community and the file upload.
 */
export async function test_api_admin_create_community_banner_success(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    password: "AdminPassword123!",
    superuser: true,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);

  // 2. Register as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinInput = {
    email: memberEmail,
    password: "MemberPassword123!",
  } satisfies ICommunityPlatformMember.ICreate;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(member);

  // 3. As member, create a community
  const communityCreateInput = {
    name: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreateInput },
    );
  typia.assert(community);

  // 4. As member, upload a file for banner use
  const fileCreateInput = {
    uploaded_by_member_id: member.id,
    original_filename: `${RandomGenerator.alphaNumeric(8)}.png`,
    storage_key: RandomGenerator.alphaNumeric(20),
    mime_type: "image/png",
    file_size_bytes: 123456,
    url: `https://cdn.example.com/banners/${RandomGenerator.alphaNumeric(32)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: fileCreateInput },
    );
  typia.assert(fileUpload);

  // 5. As admin, create a community banner referencing the uploaded file
  // (Assume the API's auth context reflects the most recent join/login, so admin context is currently active)
  const bannerInput = {
    file_upload_id: fileUpload.id,
    order: 1,
    alt_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }),
    active: true,
  } satisfies ICommunityPlatformCommunityBanner.ICreate;
  const banner: ICommunityPlatformCommunityBanner =
    await api.functional.communityPlatform.admin.communities.banners.create(
      connection,
      { communityId: community.id, body: bannerInput },
    );
  typia.assert(banner);

  // 6. Verify the banner metadata is as expected
  TestValidator.equals(
    "banner community association",
    banner.community_id,
    community.id,
  );
  TestValidator.equals(
    "banner file reference",
    banner.file_upload_id,
    fileUpload.id,
  );
  TestValidator.equals("banner is active", banner.active, true);
  TestValidator.equals("banner order", banner.order, 1);
  TestValidator.equals(
    "banner alt text",
    banner.alt_text,
    bannerInput.alt_text,
  );
}
