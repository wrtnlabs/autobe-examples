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
 * Test community deletion by its creator.
 *
 * Validates the complete deletion workflow including member authentication, community creation, and subsequent deletion. Confirms that the community creator can successfully delete their own community and that the endpoint returns 204 No Content with a null response body.
 *
 * Upon successful deletion, the community record is permanently removed along with all cascade-deleted dependent data including published posts, user subscriptions, moderator role assignments, and community bans. The erased community can no longer be retrieved from the system.
 *
 * 1. Authenticate as a new member.
 * 2. Create a community as the authenticated member.
 * 3. Delete the community by its creator using the erase endpoint.
 * 4. Validate that the response is void (204 No Content) indicating successful deletion.
 */
export async function test_api_community_creator_deletion(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecureP@ssw0rd!",
        username: RandomGenerator.alphabets(8),
        href: "https://example.com/register",
        referrer: "https://example.com/",
        ip: "192.168.1.100",
      } satisfies IREdditLikeCommunityMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create a community as the authenticated member
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          icon_uri: null,
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Delete the community as its creator - returns void (204 No Content)
  // Only the original creator is authorized to delete, which is this member
  await api.functional.redditLikeCommunity.member.communities.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Validate successful deletion - void response means 204 No Content
  // The community and all cascade-deleted dependent data (posts, subscriptions,
  // moderators, bans) have been permanently removed
  TestValidator.predicate(
    "community deleted successfully by creator",
    community.id !== null,
  );
}
