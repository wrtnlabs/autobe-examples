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

export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<("email")>>(),
      password: "TestPassword123!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(registeredMember);
  // Step 2: Login with the registered member
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedMember = await authorize_member_login(loginConnection, {
    body: {
      email: registeredMember.email,
      password: "TestPassword123!",
    } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(loggedMember);
  // Step 3: Create a community with valid name
  const communityName = `test_community_${RandomGenerator.alphabets(6)}`;
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        name: communityName satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">,
        icon_url: "https://example.com/community-icon.png" satisfies
          | (string & tags.MaxLength<80000> & tags.Format<("uri")>)
          | undefined,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 4: Verify community creation details
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "owner matches creator",
    community.owner.id,
    loggedMember.id,
  );
  TestValidator.equals(
    "owner username matches creator",
    community.owner.username,
    loggedMember.username,
  );
  TestValidator.predicate(
    "community has valid creation timestamp",
    new Date(community.created_at).getTime() > 0,
  );
  TestValidator.equals(
    "subscriber count starts at 1 (creator is auto-subscribed)",
    community.subscriber_count,
    1,
  );
  TestValidator.equals("posts count starts at 0", community.posts_count, 0);
}