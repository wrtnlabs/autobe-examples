import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_communities_images_create } from "../../../generate/generate_random_community_platform_member_communities_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_community_icon_update_ordering_and_activation(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create a member account via join
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community as the member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Upload first image (initial active image)
  const firstImage =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        body: {
          uri: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
          filename: `image1.png`,
          content_type: "image/png" satisfies string as string &
            tags.Pattern<"^(image\\/(jpeg|png|gif))$">,
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >() satisfies number as number,
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >() satisfies number as number,
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<2097152>
          >() satisfies number as number,
          ordering: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          active: true,
        } satisfies ICommunityPlatformCommunityImage.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(firstImage);
  // 4. Upload second image (initially inactive)
  const secondImage =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        body: {
          uri: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
          filename: `image2.jpg`,
          content_type: "image/jpeg" satisfies string as string &
            tags.Pattern<"^(image\\/(jpeg|png|gif))$">,
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >() satisfies number as number,
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >() satisfies number as number,
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<2097152>
          >() satisfies number as number,
          ordering: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          active: false,
        } satisfies ICommunityPlatformCommunityImage.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(secondImage);
  // 5. Update second image metadata: change ordering and activate it
  const updateBody = {
    ordering: 0 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0> as number,
    active: true,
  } satisfies ICommunityPlatformCommunityImage.IUpdate;
  const updatedImage =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: secondImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 6. Validate metadata updates
  TestValidator.equals("ordering updated", updatedImage.ordering, 0);
  TestValidator.equals("active status updated", updatedImage.active, true);
  // 7. Verify that first image was deactivated by checking business logic
  // Since we don't have GET endpoint, we verify through the update behavior:
  // The second image is now active, so first image should be deactivated
  TestValidator.predicate(
    "updated_at timestamp should be updated",
    new Date(updatedImage.updatedAt) > new Date(secondImage.updatedAt),
  );
  // 8. Test that community relationship is preserved
  TestValidator.equals(
    "community id preserved",
    updatedImage.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name preserved",
    updatedImage.community.name,
    community.name,
  );
  // 9. Test immutable properties remain unchanged
  TestValidator.equals("uri unchanged", updatedImage.uri, secondImage.uri);
  TestValidator.equals(
    "filename unchanged",
    updatedImage.filename,
    secondImage.filename,
  );
  TestValidator.equals(
    "content type unchanged",
    updatedImage.contentType,
    secondImage.contentType,
  );
  TestValidator.equals(
    "width unchanged",
    updatedImage.width,
    secondImage.width,
  );
  TestValidator.equals(
    "height unchanged",
    updatedImage.height,
    secondImage.height,
  );
  TestValidator.equals(
    "size unchanged",
    updatedImage.sizeBytes,
    secondImage.sizeBytes,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedImage.createdAt,
    secondImage.createdAt,
  );
  // 10. Test the critical business rule: only one image can be active per community
  // Since we activated second image, test that first image's active status is false
  // We don't have GET, but we can test by updating first image back to active
  // This should deactivate the second image
  const reactivateFirstBody = {
    active: true,
  } satisfies ICommunityPlatformCommunityImage.IUpdate;
  const reactivatedFirstImage =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: firstImage.id,
        body: reactivateFirstBody,
      },
    );
  typia.assert(reactivatedFirstImage);
  TestValidator.equals(
    "first image reactivated",
    reactivatedFirstImage.active,
    true,
  );
  // Fetch the second image again to verify it was deactivated
  const secondImageUpdated =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: secondImage.id,
        body: {} satisfies ICommunityPlatformCommunityImage.IUpdate, // Empty update to fetch current state
      },
    );
  typia.assert(secondImageUpdated);
  TestValidator.equals(
    "second image deactivated after first reactivated",
    secondImageUpdated.active,
    false,
  );
}
