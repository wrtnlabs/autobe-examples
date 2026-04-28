import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Validates authorization boundary for community updates.
 *
 * Tests that a member who is neither the creator nor a moderator of a community is forbidden from updating community details.
 *
 * 1. Creates a community via a creator member.
 * 2. Authenticates a separate unauthorized member.
 * 3. Attempts to update the community details using the unauthorized member's connection.
 * 4. Verifies that the API returns a 403 Forbidden error, confirming that permission is correctly denied to unauthorized users.
 *
 * @param connection The base API connection.
 */
export async function test_api_community_unauthorized_member_update(
  connection: api.IConnection,
) {
  // 1. Creator setup
  const creatorConnection: api.IConnection = { host: connection.host };
  const joinBodyCreator: IREdditLikeCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_member_join(creatorConnection, { body: joinBodyCreator });
  // 1.1. Create community
  const communityCreateBody: IREdditLikeCommunityCommunity.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      creatorConnection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  // 2. Unauthorized member setup
  const unauthMemberConnection: api.IConnection = { host: connection.host };
  const joinBodyUnauth: IREdditLikeCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_member_join(unauthMemberConnection, { body: joinBodyUnauth });
  // 3. & 4. Unauthorized update attempt & validation
  const updateBody: IREdditLikeCommunityCommunity.IUpdate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  await TestValidator.httpError(
    "unauthorized member update is forbidden",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.communities.update(
        unauthMemberConnection,
        {
          communityId: community.id,
          body: updateBody,
        },
      );
    },
  );
}
