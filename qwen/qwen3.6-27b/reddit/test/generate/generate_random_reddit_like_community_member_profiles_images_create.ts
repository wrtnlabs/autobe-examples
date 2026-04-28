import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_profile_image } from "../prepare/prepare_random_reddit_like_community_profile_image";

/**
 * Generate a random profile image attachment for a community profile for E2E testing.
 *
 * Prepares random profile image data using the prepare function, then calls the creation endpoint.
 * The profile image is attached to the profile specified by profileId. Upon successful creation, the new image immediately
 * becomes viewable as part of the profile's collection.
 */
export async function generate_random_reddit_like_community_member_profiles_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IREdditLikeCommunityProfileImage.ICreate>;
    params: {
      profileId: string;
    };
  },
): Promise<IREdditLikeCommunityProfileImage> {
  const prepared: IREdditLikeCommunityProfileImage.ICreate =
    prepare_random_reddit_like_community_profile_image(props.body);
  const result: IREdditLikeCommunityProfileImage =
    await api.functional.redditLikeCommunity.member.profiles.images.create(
      connection,
      {
        profileId: props.params.profileId,
        body: prepared,
      },
    );
  return result;
}
