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
import { generate_random_community_platform_member_communities_images_create } from "../../../generate/generate_random_community_platform_member_communities_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_community_icon_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member (the future community owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community — member becomes its owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload an initial icon image for the community
  const initialImage =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(initialImage);
  // 4. Prepare updated image metadata
  const updateBody = {
    name: `${RandomGenerator.alphabets(12)}.png`,
    mime_type: "image/png",
    size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityImage.IUpdate;
  // 5. Call the target PUT operation to replace the icon
  const updatedImage =
    await api.functional.communityPlatform.member.communities.images.update(
      memberConnection,
      {
        communityId: community.id,
        imageId: initialImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 6. Validate the updated record
  TestValidator.equals("name is updated", updatedImage.name, updateBody.name);
  TestValidator.equals(
    "mime_type is updated",
    updatedImage.mime_type,
    updateBody.mime_type,
  );
  TestValidator.equals("size is updated", updatedImage.size, updateBody.size);
  TestValidator.equals("url is updated", updatedImage.url, updateBody.url);
  TestValidator.notEquals(
    "updated_at is refreshed",
    updatedImage.updated_at,
    initialImage.updated_at,
  );
  TestValidator.equals(
    "id remains unchanged",
    updatedImage.id,
    initialImage.id,
  );
}
