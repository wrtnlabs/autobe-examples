import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with verified email using authorize utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new community with unique name and description
  const communityConnection: api.IConnection = { host: connection.host };
  // The authorize_member_join function automatically sets the Authorization header in memberConnection
  // Use a new connection object for community creation
  const community =
    await api.functional.redditCommunity.member.communities.create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Validate community creation
  TestValidator.equals(
    "community name matches",
    community.name,
    community.name,
  );
  TestValidator.equals(
    "description matches",
    community.description,
    community.description,
  );
  TestValidator.predicate(
    "subscriber count is 1",
    community.subscriber_count === 1,
  );
  TestValidator.equals(
    "owner id matches member id",
    community.owner.id,
    member.id,
  );
  TestValidator.equals(
    "owner username matches member username",
    community.owner.username,
    member.username,
  );
  TestValidator.equals("icon_url is null", community.icon_url, null);
}