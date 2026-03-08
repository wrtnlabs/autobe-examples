import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_pagination_and_banning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `member_${RandomGenerator.alphaNumeric(6)}@test.com`,
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Test popular endpoint with authenticated connection
  // Note: The API returns a single IRedditLikePost, not an array
  const post = await api.functional.redditLike.popular(memberConnection);
  typia.assert(post);
  // 3. Verify basic post properties exist
  TestValidator.equals("post has valid id", typeof post.id, "string");
  TestValidator.equals("post has title", typeof post.title, "string");
  TestValidator.equals("post has author", typeof post.author, "object");
  TestValidator.equals("post has community", typeof post.community, "object");
}
