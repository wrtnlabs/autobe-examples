import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that a guest actor can successfully retrieve an active (non-soft-deleted) community icon image record with its full metadata.
 *
 * Validates the retrieval of a community icon image record via the public GET endpoint. The test ensures that an unauthenticated user can successfully fetch the image metadata, that the returned fields match the values provided during community creation, and that the image record is active (deleted_at is null).
 *
 * 1. Register a new member account via authorize_member_join to create an authenticated session.
 * 2. Create a community with specific icon image details (name, MIME type, size, and URI) via generate_random_community_platform_member_communities_create.
 * 3. Extract the community ID and the icon image ID from the community creation response.
 * 4. As a guest (unauthenticated), retrieve the icon image record via GET /communities/{communityId}/images/{imageId}.
 * 5. Validate the response contains all required ICommunityPlatformCommunityImage fields using typia.assert.
 * 6. Verify the returned image metadata matches the values provided during creation.
 * 7. Verify the image is active (deleted_at is null).
 * 8. Verify the community summary reference is correct.
 */
export async function test_api_community_icon_image_retrieval_active_image(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Prepare known image values for verification
  const imageName = "test-community-icon.png";
  const imageMimeType = "image/png";
  const imageSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1048576>
  >();
  // Step 3: Create community with known icon image details
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          images: [
            {
              name: imageName,
              mime_type: imageMimeType,
              size: imageSize,
              url: typia.random<string & tags.Format<"uri">>(),
            },
          ],
        },
      },
    );
  typia.assert(community);
  // Ensure the community has an icon image (it should, since we created it with one)
  const iconImage = typia.assert(community.icon!);
  // Step 4: As a guest (unauthenticated), retrieve the icon image record
  const guestConnection: api.IConnection = { host: connection.host };
  const image = await api.functional.communityPlatform.communities.images.at(
    guestConnection,
    {
      communityId: community.id,
      imageId: iconImage.id,
    },
  );
  typia.assert(image);
  // Step 5-8: Verify response matches provided values
  TestValidator.equals(
    "image ID matches community icon ID",
    image.id,
    iconImage.id,
  );
  TestValidator.equals("image name matches input", image.name, imageName);
  TestValidator.equals(
    "image MIME type matches input",
    image.mime_type,
    imageMimeType,
  );
  TestValidator.equals("image size matches input", image.size, imageSize);
  TestValidator.predicate(
    "image is active (deleted_at is null)",
    image.deleted_at === null,
  );
  TestValidator.equals(
    "community reference ID matches",
    image.community.id,
    community.id,
  );
  TestValidator.equals(
    "community reference name matches",
    image.community.name,
    community.name,
  );
}
