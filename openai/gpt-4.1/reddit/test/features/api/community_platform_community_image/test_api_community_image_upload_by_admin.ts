import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate admin uploading/associating an image to a community.
 *
 * Steps:
 *
 * 1. Register admin, authenticate
 * 2. Register a member, authenticate
 * 3. Create a community as the member (to get the community context)
 * 4. Upload a file as the member (to get a file_upload resource)
 * 5. Switch to admin context, upload image referencing file for the community
 * 6. Validate image association, fields, response, and business rules
 * 7. Negative cases: unauthenticated/invalid role/permissions, invalid metadata
 */
export async function test_api_community_image_upload_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and auth
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin!Password1",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Member registration and auth
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "Member!Password1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create a community as member
  const communityBody = {
    name: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 4. As member, upload a file (image)
  const fileUploadBody = {
    uploaded_by_member_id: member.id,
    original_filename: RandomGenerator.alphaNumeric(8) + ".png",
    storage_key: RandomGenerator.alphaNumeric(32),
    mime_type: "image/png",
    file_size_bytes: 1024,
    url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(24),
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: fileUploadBody },
    );
  typia.assert(fileUpload);

  // 5. Switch to admin: Use the image endpoint
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin!Password1",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  const imageInput = {
    file_upload_id: fileUpload.id,
    image_type: "icon",
    order: 1,
    alt_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }),
    active: true,
  } satisfies ICommunityPlatformCommunityImage.ICreate;
  const image: ICommunityPlatformCommunityImage =
    await api.functional.communityPlatform.admin.communities.images.create(
      connection,
      {
        communityId: community.id,
        body: imageInput,
      },
    );
  typia.assert(image);
  TestValidator.equals(
    "community_id matches",
    image.community_id,
    community.id,
  );
  TestValidator.equals(
    "file_upload_id matches",
    image.file_upload_id,
    fileUpload.id,
  );
  TestValidator.equals(
    "image_type matches",
    image.image_type,
    imageInput.image_type,
  );
  TestValidator.equals("order matches", image.order, imageInput.order);
  TestValidator.equals("alt_text matches", image.alt_text, imageInput.alt_text);
  TestValidator.equals("active flag matches", image.active, imageInput.active);

  // Negative: fail as unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin upload should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.images.create(
        unauthConn,
        {
          communityId: community.id,
          body: imageInput,
        },
      );
    },
  );

  // Negative: fail with invalid type/order (type as empty string)
  await TestValidator.error(
    "invalid image_type (empty string) should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.images.create(
        connection,
        {
          communityId: community.id,
          body: { ...imageInput, image_type: "" },
        },
      );
    },
  );
}
