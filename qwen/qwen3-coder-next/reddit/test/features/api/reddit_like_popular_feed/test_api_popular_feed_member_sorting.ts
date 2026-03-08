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

export async function test_api_popular_feed_member_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(memberAuth);
  // Test popular feed without sorting (basic authenticated access)
  const allPosts: IRedditLikePost[] = typia.assert<IRedditLikePost[]>(await api.functional.redditLike.popular(memberConnection));
  // Verify response structure
  TestValidator.predicate("has posts", allPosts.length > 0);
  if (allPosts.length > 0) {
    TestValidator.equals("first post has id", typeof allPosts[0].id, "string");
    TestValidator.equals("first post has author", !!allPosts[0].author, true);
    TestValidator.equals(
      "first post has community",
      !!allPosts[0].community,
      true,
    );
  }
}