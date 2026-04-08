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

export async function test_api_community_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community to be deleted
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: `test-community-${RandomGenerator.alphabets(8)}`,
        description: "Test community for deletion validation",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. First deletion - should succeed
  await api.functional.redditLike.member.communities.erase(memberConnection, {
    communityId: community.id,
  });
  // 4. Second deletion - should fail with 404 Not Found
  await TestValidator.httpError("community already deleted", 404, async () => {
    await api.functional.redditLike.member.communities.erase(memberConnection, {
      communityId: community.id,
    });
  });
}
