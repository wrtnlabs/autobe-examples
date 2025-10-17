import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";

/**
 * Attempt to update a community image as a non-admin (e.g., normal member or
 * moderator) and verify that the operation is forbidden and does not succeed.
 *
 * 1. Register as admin (and capture admin-privileged connection/token).
 * 2. Register as a member to be able to create a community (simulate by creating a
 *    community as a member, since there is no explicit member join in the
 *    relevant APIs; assume the connection is sufficient).
 * 3. Create a community (as a member).
 * 4. Upload a file as the member for use as a community image.
 * 5. Create a community image as admin (using the admin's connection, referencing
 *    the previously created community and file).
 * 6. Forge a connection with no admin token (simulate non-admin by clearing the
 *    headers).
 * 7. Attempt to update the community image as a non-admin (member connection) on
 *    the admin-only endpoint.
 * 8. Assert that the operation fails with appropriate access denied/forbidden
 *    error.
 */
export async function test_api_community_admin_image_update_forbidden_for_non_admins(
  connection: api.IConnection,
) {
  // 1. Register as platform admin and get authorized connection
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a community as a member (simulate member by using plain connection)
  const communityName = RandomGenerator.alphabets(12);
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const communityInput = {
    name: communityName,
    title: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: communitySlug,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);

  // 3. Upload file as a member
  const fileInput = {
    uploaded_by_member_id: community.creator_member_id,
    original_filename: RandomGenerator.alphabets(8) + ".png",
    storage_key: RandomGenerator.alphaNumeric(32),
    mime_type: "image/png",
    file_size_bytes: 1024,
    url: `https://${RandomGenerator.alphabets(15)}.com/image/${RandomGenerator.alphaNumeric(16)}`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: fileInput,
      },
    );
  typia.assert(fileUpload);

  // 4. Create community image as admin
  const imageInput = {
    file_upload_id: fileUpload.id,
    image_type: "icon",
    active: true,
  } satisfies ICommunityPlatformCommunityImage.ICreate;
  const communityImage =
    await api.functional.communityPlatform.admin.communities.images.create(
      connection,
      {
        communityId: community.id,
        body: imageInput,
      },
    );
  typia.assert(communityImage);

  // 5. Forge a 'non-admin' connection (remove Authorization token)
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  // 6. Attempt to update the community image as a non-admin
  await TestValidator.error(
    "non-admin cannot update community image via admin endpoint",
    async () => {
      await api.functional.communityPlatform.admin.communities.images.update(
        memberConnection,
        {
          communityId: community.id,
          imageId: communityImage.id,
          body: {
            active: false,
            alt_text: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformCommunityImage.IUpdate,
        },
      );
    },
  );
}
