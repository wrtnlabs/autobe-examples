import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post } from "../prepare/prepare_random_community_platform_post";

/**
 * Generate a random community platform post via the API for E2E testing.
 *
 * Prepares random post creation data using the prepare function, then calls the
 * create endpoint to persist the post. The generated post can be of type text,
 * link, or image, with type-specific content populated accordingly.
 *
 * @param connection API connection configuration
 * @param props Optional partial input to override specific generated values
 * @returns The fully created post including system-assigned fields
 */
export async function generate_random_community_platform_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPost.ICreate> | undefined;
  },
): Promise<ICommunityPlatformPost> {
  const prepared: ICommunityPlatformPost.ICreate =
    prepare_random_community_platform_post(props.body);
  return await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: prepared,
    },
  );
}
