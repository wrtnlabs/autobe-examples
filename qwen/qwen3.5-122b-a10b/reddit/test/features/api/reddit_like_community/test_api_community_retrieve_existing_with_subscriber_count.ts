import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_retrieve_existing_with_subscriber_count(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Retrieve the community details
  const retrieved: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.at(memberConnection, {
      communityId: community.id,
    });
  typia.assert(retrieved);
  // 4. Validate community structure
  TestValidator.equals("community ID matches", retrieved.id, community.id);
  TestValidator.equals(
    "community name matches",
    retrieved.name,
    community.name,
  );
  TestValidator.predicate(
    "subscriber count is non-negative",
    retrieved.subscriber_count >= 0,
  );
  // 5. Validate owner information matches
  TestValidator.equals("owner ID matches", retrieved.owner.id, member.id);
  TestValidator.equals(
    "owner username matches",
    retrieved.owner.username,
    member.username,
  );
  TestValidator.equals(
    "owner display name matches",
    retrieved.owner.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "owner karma score exists",
    retrieved.owner.karma_score >= 0,
  );
}
