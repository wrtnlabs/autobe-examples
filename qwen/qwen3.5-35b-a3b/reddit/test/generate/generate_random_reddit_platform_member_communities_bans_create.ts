import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_banned_user } from "../prepare/prepare_random_reddit_platform_banned_user";

/**
 * Generate a random ban record for a Reddit-like platform community for E2E testing.
 *
 * Prepares random ban data using the prepare function, then calls the creation endpoint with the specified community name. Creates a ban record that restricts a user from participating in a community.
 *
 * The ban immediately prevents the user from creating posts or comments while preserving read-only access. Requires a community name via props.params to identify the target community.
 */
export async function generate_random_reddit_platform_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformBannedUser.ICreate>;
    params?: {
      communityName: string;
    };
  },
): Promise<IRedditPlatformBannedUser> {
  const prepared: IRedditPlatformBannedUser.ICreate =
    prepare_random_reddit_platform_banned_user(props.body);
  const result: IRedditPlatformBannedUser =
    await api.functional.redditPlatform.member.communities.bans.create(
      connection,
      {
        communityName: props.params?.communityName ?? "test-community",
        body: prepared,
      },
    );
  return result;
}