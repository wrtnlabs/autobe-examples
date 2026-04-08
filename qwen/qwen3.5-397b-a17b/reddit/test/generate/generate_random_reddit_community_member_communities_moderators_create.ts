import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_moderator } from "../prepare/prepare_random_reddit_community_moderator";

/**
 * Generate a random Reddit community moderator assignment via the API for E2E testing.
 *
 * Prepares random moderator data using the prepare function, then calls the creation endpoint to add a moderator to a community. The communityId path parameter identifies the target community, while the request body specifies the member to add and their role (owner or moderator).
 *
 * This function is designed for end-to-end testing scenarios where a moderator needs to be added to an existing community. The prepare function generates randomized memberId (UUID format) and role (either 'owner' or 'moderator'), both of which can be customized through the optional body parameter.
 */
export async function generate_random_reddit_community_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityModerator.ICreate>;
    params?: {
      communityId: string;
    };
  },
): Promise<IRedditCommunityModerator> {
  const prepared: IRedditCommunityModerator.ICreate =
    prepare_random_reddit_community_moderator(props.body);
  const result: IRedditCommunityModerator =
    await api.functional.redditCommunity.member.communities.moderators.create(
      connection,
      {
        body: prepared,
        communityId: props.params!.communityId,
      },
    );
  return result;
}