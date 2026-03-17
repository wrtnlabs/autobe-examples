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

/**
 * Test business logic of single active image per community.
 *
 * 1. Create member account
 * 2. Create community
 * 3. Upload three images to community (all initially inactive)
 * 4. Activate first image via metadata update, verify it becomes active
 * 5. Activate second image, verify first image is automatically deactivated
 * 6. Activate third image, verify both previous images are inactive
 * 7. Test ordering behavior independent of activation status
 */
export async function test_api_community_icon_single_active_image_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Upload three images (all initially inactive)
  const images: ICommunityPlatformCommunityImage[] = [];
  for (let i = 0; i < 3; i++) {
    const image =
      await generate_random_community_platform_member_communities_images_create(
        memberConnection,
        {
          params: { communityId: community.id },
          body: {
            uri: `https://example.com/image${i}.jpg`,
            filename: `image${i}.jpg`,
            content_type: "image/jpeg",
            width: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<10000>
            >(),
            height: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<10000>
            >(),
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<2097152>
            >(),
            ordering: i,
            active: false,
          },
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // Verify all images are initially inactive
  for (const image of images) {
    TestValidator.equals("image initially inactive", image.active, false);
  }
  // 4. Activate first image
  const firstUpdate =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[0].id,
        body: {
          active: true,
        } satisfies ICommunityPlatformCommunityImage.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.equals("first image activated", firstUpdate.active, true);
  // Refresh image list to verify only first is active
  // We'll update the images array with fresh data
  const firstImageRefreshed =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[0].id,
        body: {},
      },
    );
  typia.assert(firstImageRefreshed);
  TestValidator.equals(
    "first image remains active",
    firstImageRefreshed.active,
    true,
  );
  // 5. Activate second image, should deactivate first
  const secondUpdate =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[1].id,
        body: {
          active: true,
        } satisfies ICommunityPlatformCommunityImage.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals("second image activated", secondUpdate.active, true);
  // Verify first image is now inactive
  const firstImageAfterSecondActivation =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[0].id,
        body: {},
      },
    );
  typia.assert(firstImageAfterSecondActivation);
  TestValidator.equals(
    "first image deactivated after second activation",
    firstImageAfterSecondActivation.active,
    false,
  );
  // 6. Activate third image, should deactivate second
  const thirdUpdate =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[2].id,
        body: {
          active: true,
        } satisfies ICommunityPlatformCommunityImage.IUpdate,
      },
    );
  typia.assert(thirdUpdate);
  TestValidator.equals("third image activated", thirdUpdate.active, true);
  // Verify both previous images are inactive
  const firstImageAfterThirdActivation =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[0].id,
        body: {},
      },
    );
  typia.assert(firstImageAfterThirdActivation);
  TestValidator.equals(
    "first image remains inactive",
    firstImageAfterThirdActivation.active,
    false,
  );
  const secondImageAfterThirdActivation =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[1].id,
        body: {},
      },
    );
  typia.assert(secondImageAfterThirdActivation);
  TestValidator.equals(
    "second image deactivated after third activation",
    secondImageAfterThirdActivation.active,
    false,
  );
  // 7. Test ordering behavior independent of activation status
  // Update ordering for second image without changing activation
  const orderingUpdate =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[1].id,
        body: {
          ordering: 99,
        } satisfies ICommunityPlatformCommunityImage.IUpdate,
      },
    );
  typia.assert(orderingUpdate);
  TestValidator.equals("ordering updated", orderingUpdate.ordering, 99);
  TestValidator.equals(
    "activation status unchanged after ordering update",
    orderingUpdate.active,
    false,
  );
  // Verify third image remains active
  const thirdImageCheck =
    await api.functional.communityPlatform.member.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: images[2].id,
        body: {},
      },
    );
  typia.assert(thirdImageCheck);
  TestValidator.equals(
    "third image remains active after ordering changes",
    thirdImageCheck.active,
    true,
  );
}
