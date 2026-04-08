import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_ban } from "../prepare/prepare_random_reddit_like_community_ban";

/**
 * Generate a random community ban record via the API for E2E testing.
 *
 * Prepares random ban data using the prepare function, then calls the ban creation endpoint.
 * The ban restricts a member's ability to create posts or comments in a specific community
 * while retaining their viewing access.
 *
 * ## Parameters
 *
 * - `connection`: HTTP connection information for the API server
 * - `props.body`: Optional partial ban creation data to override random values
 * - `props.params.communityId`: UUID of the community where the ban will be issued
 *
 * ## Authorization
 *
 * Only the community owner or existing moderators can ban users from their community.
 * The requesting member must be authenticated and have moderator authority in the target community.
 *
 * ## Business Rules
 *
 * - The target community must exist and not be deleted
 * - The member to ban must exist and not be soft-deleted
 * - The member cannot already be actively banned from this community
 * - Banned members retain viewing access to community content
 *
 * @example
 *   ```typescript
 *   // Generate a ban with random member_id
 *   const ban = await generate_random_reddit_like_member_communities_bans_create(connection, {
 *     params: { communityId: "community-uuid-here" },
 *   });
 *
 *   // Generate a ban with specific member_id
 *   const customBan = await generate_random_reddit_like_member_communities_bans_create(connection, {
 *     body: { member_id: "550e8400-e29b-41d4-a716-446655440000" },
 *     params: { communityId: "community-uuid-here" },
 *   });
 *   ```
 */
export async function generate_random_reddit_like_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityBan.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditLikeCommunityBan> {
  const prepared: IRedditLikeCommunityBan.ICreate =
    prepare_random_reddit_like_community_ban(props.body);
  const result: IRedditLikeCommunityBan =
    await api.functional.redditLike.member.communities.bans.create(connection, {
      communityId: props.params.communityId,
      body: prepared,
    });
  return result;
}
