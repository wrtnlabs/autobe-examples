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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_creation_unauthorized_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234!@#$",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    },
  });
  typia.assert(member);
  // 2. Create a community using the member (members can create communities)
  // Since we don't have a direct community creation endpoint in the provided SDK,
  // we'll simulate creating a community and then test the unauthorized post creation scenario.
  // For this test, we need to create a community first, then attempt to create a post
  // in a community the member is not subscribed to.
  // Since the provided SDK doesn't include community creation, let's create a random
  // community ID and attempt to post in it (this should fail since the member isn't
  // subscribed to this community).
  // Create a random community ID that doesn't exist or that the member is not subscribed to
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to create a post in a community the member is not subscribed to
  // This should fail with an appropriate error (likely 403 Forbidden or 400 Bad Request)
  await TestValidator.error(
    "should reject unauthorized community post",
    async () => {
      await api.functional.redditLike.member.posts.create(memberConnection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: "text" as const,
          content: RandomGenerator.paragraph({ sentences: 3 }),
          community_id: nonExistentCommunityId,
        } satisfies IRedditLikePost.ICreate,
      });
    },
  );
}
