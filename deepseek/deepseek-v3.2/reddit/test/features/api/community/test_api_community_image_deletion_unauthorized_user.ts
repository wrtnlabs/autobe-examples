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

export async function test_api_community_image_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community owned by first member
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload image to community using owner connection
  const image =
    await generate_random_community_platform_member_communities_images_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          uri: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
          filename: RandomGenerator.alphaNumeric(8) + ".jpg",
          content_type: typia.random<
            string & tags.Pattern<"^(image\\/(jpeg|png|gif))$">
          >(),
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
          ordering: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          active: false,
        } satisfies ICommunityPlatformCommunityImage.ICreate,
      },
    );
  typia.assert(image);
  // 4. Create second member (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {});
  typia.assert(nonOwner);
  // 5. Attempt deletion with non-owner connection (should fail)
  await TestValidator.error("unauthorized deletion", async () => {
    await api.functional.communityPlatform.member.images.erase(
      nonOwnerConnection,
      {
        communityId: community.id satisfies string & tags.Format<"uuid">,
        imageId: image.id satisfies string & tags.Format<"uuid">,
      },
    );
  });
  // 6. Verify image still exists (no deletion occurred)
  // Since there's no GET endpoint for single image in SDK, we can't directly verify
  // But the error validation above confirms deletion was prevented
}
