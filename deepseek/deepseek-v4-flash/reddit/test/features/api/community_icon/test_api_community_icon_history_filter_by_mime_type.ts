import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";
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

export async function test_api_community_icon_history_filter_by_mime_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community with an initial icon having MIME type "image/png"
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          images: [
            {
              mime_type: "image/png",
            },
          ],
        },
      },
    );
  typia.assert(community);
  // 3. Upload a second icon with MIME type "image/jpeg" to replace the active icon
  const secondIcon =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        body: {
          mime_type: "image/jpeg",
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(secondIcon);
  // 4. Call PATCH with mime_type filter "image/jpeg" — expect exactly 1 matching active record
  const jpegResult =
    await api.functional.communityPlatform.communities.images.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          mime_type: "image/jpeg",
        },
      },
    );
  typia.assert(jpegResult);
  TestValidator.equals("jpeg image count", jpegResult.data.length, 1);
  TestValidator.equals(
    "jpeg image mime type matches filter",
    jpegResult.data[0].mime_type,
    "image/jpeg",
  );
  // 5. Call PATCH with mime_type filter "image/webp" — expect empty result with pagination metadata
  const webpResult =
    await api.functional.communityPlatform.communities.images.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          mime_type: "image/webp",
        },
      },
    );
  typia.assert(webpResult);
  TestValidator.equals("webp image count is zero", webpResult.data.length, 0);
  TestValidator.equals(
    "webp pagination records is zero",
    webpResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "webp pagination pages is zero",
    webpResult.pagination.pages,
    0,
  );
}
