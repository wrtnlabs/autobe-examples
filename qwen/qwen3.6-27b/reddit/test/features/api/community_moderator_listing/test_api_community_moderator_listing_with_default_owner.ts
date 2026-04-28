import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
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
 * Tests that community moderator listing shows the creator as the default owner.
 *
 * 1. Creates a member and authenticates.
 * 2. Creates a new community.
 * 3. Retrieves moderators without filtering.
 * 4. Validates the creator is the owner.
 */
export async function test_api_community_moderator_listing_with_default_owner(
  connection: api.IConnection,
) {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const member = await api.functional.redditLikeCommunity.auth.member.join(
    memberConnection,
    { body: joinBody },
  );
  typia.assert(member);
  // 2. Create community
  const communityBody = {
    name: typia.random<string>(),
    description: typia.random<string>(),
  } satisfies IREdditLikeCommunityCommunity.ICreate;
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      { body: communityBody },
    );
  typia.assert(community);
  // 3. List moderators
  const moderators =
    await api.functional.redditLikeCommunity.communities.community_moderators.index(
      memberConnection,
      { communityId: community.id, body: {} },
    );
  typia.assert(moderators);
  // 4. Validate
  TestValidator.equals(
    "owner is the creator",
    moderators.data[0].member.id,
    community.creator.id,
  );
  TestValidator.equals("role is owner", moderators.data[0].role, "owner");
  TestValidator.equals("pagination records", moderators.pagination.records, 1);
}
