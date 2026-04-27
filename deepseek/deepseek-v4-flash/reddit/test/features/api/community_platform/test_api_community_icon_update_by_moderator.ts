import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

export async function test_api_community_icon_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as memberA (future community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuth);
  // Step 2: Join as memberB (future moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  // Step 3: As memberA, create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 4: As memberA, appoint memberB as a moderator
  const moderator =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: memberBAuth.username,
        },
      },
    );
  typia.assert(moderator);
  // Step 5: As memberA, upload an initial icon image
  const initialImage =
    await generate_random_community_platform_member_communities_images_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(initialImage);
  // Step 6: As memberB, replace the community icon via the target PUT operation
  const updateBody = typia.random<ICommunityPlatformCommunityImage.IUpdate>();
  const updatedImage =
    await api.functional.communityPlatform.member.communities.images.update(
      memberBConnection,
      {
        communityId: community.id,
        imageId: initialImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // Validate: the updated record contains the new file metadata values
  if (updateBody.name !== undefined) {
    TestValidator.equals("name updated", updatedImage.name, updateBody.name);
  }
  if (updateBody.mime_type !== undefined) {
    TestValidator.equals(
      "mime_type updated",
      updatedImage.mime_type,
      updateBody.mime_type,
    );
  }
  if (updateBody.size !== undefined) {
    TestValidator.equals("size updated", updatedImage.size, updateBody.size);
  }
  if (updateBody.url !== undefined) {
    TestValidator.equals("url updated", updatedImage.url, updateBody.url);
  }
}
