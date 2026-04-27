import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_image } from "../prepare/prepare_random_community_platform_community_image";

/**
 * Generate a random community icon image for E2E testing.
 *
 * Prepares random community icon image data using the prepare function, then
 * uploads it to a specific community via the API. The API operation validates
 * that the requesting member is the community owner or moderator, soft-deletes
 * the previous icon, uploads the file to external storage, and returns the
 * created image record with storage URL.
 *
 * @param connection The API connection object
 * @param props.body Optional partial data to override specific generated image values
 * @param props.params.communityId The UUID of the community to upload the icon image for
 * @returns The created community icon image record
 */
export async function generate_random_community_platform_member_communities_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunityImage.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformCommunityImage> {
  const prepared: ICommunityPlatformCommunityImage.ICreate =
    prepare_random_community_platform_community_image(props.body);
  return await api.functional.communityPlatform.member.communities.images.create(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    },
  );
}
