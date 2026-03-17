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

export async function test_api_community_image_deletion_active_image_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Upload first image marked as active (ordering 1)
  const image1 =
    await generate_random_community_platform_member_communities_images_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
          filename: `icon1.jpg`,
          content_type: typia.assert<string & tags.Pattern<"^(image\\/(jpeg|png|gif))$">>("image/jpeg"),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<2097152>
          >(),
          ordering: 1 satisfies number,
          active: true,
        } satisfies ICommunityPlatformCommunityImage.ICreate,
      },
    );
  typia.assert(image1);
  TestValidator.equals("first image should be active", image1.active, true);
  // 4. Upload second image marked as inactive (ordering 2)
  const image2 =
    await generate_random_community_platform_member_communities_images_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
          filename: `icon2.jpg`,
          content_type: typia.assert<string & tags.Pattern<"^(image\\/(jpeg|png|gif))$">>("image/jpeg"),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<2097152>
          >(),
          ordering: 2 satisfies number,
          active: false,
        } satisfies ICommunityPlatformCommunityImage.ICreate,
      },
    );
  typia.assert(image2);
  TestValidator.equals("second image should be inactive", image2.active, false);
  // 5. Delete the active image (image1)
  await api.functional.communityPlatform.member.images.erase(ownerConnection, {
    communityId: community.id satisfies string & tags.Format<"uuid">,
    imageId: image1.id satisfies string & tags.Format<"uuid">,
  });
  // 6. Upload third image marked as inactive (ordering 3)
  const image3 =
    await generate_random_community_platform_member_communities_images_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
          filename: `icon3.jpg`,
          content_type: typia.assert<string & tags.Pattern<"^(image\\/(jpeg|png|gif))$">>("image/jpeg"),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<2097152>
          >(),
          ordering: 3 satisfies number,
          active: false,
        } satisfies ICommunityPlatformCommunityImage.ICreate,
      },
    );
  typia.assert(image3);
  // 7. Now delete image2 (which should have become active after image1 deletion)
  await api.functional.communityPlatform.member.images.erase(ownerConnection, {
    communityId: community.id satisfies string & tags.Format<"uuid">,
    imageId: image2.id satisfies string & tags.Format<"uuid">,
  });
  // 8. Verify that image3 is now active by checking that we can delete it
  // (no active image validation error should occur)
  await api.functional.communityPlatform.member.images.erase(ownerConnection, {
    communityId: community.id satisfies string & tags.Format<"uuid">,
    imageId: image3.id satisfies string & tags.Format<"uuid">,
  });
  // The test validates the deletion workflow.
  // While we cannot directly verify which image became active after each deletion
  // (due to lack of GET endpoint), we validate that:
  // 1. Images can be uploaded with different ordering values
  // 2. Active images can be deleted
  // 3. The deletion operations succeed without errors
  // 4. Multiple images can be managed in sequence
}
