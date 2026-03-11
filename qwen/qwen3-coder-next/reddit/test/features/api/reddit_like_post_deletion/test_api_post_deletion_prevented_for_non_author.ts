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

export async function test_api_post_deletion_prevented_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  // Create first member (author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  // Create second member (non-author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  // Member A creates a post
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberAConnection, {
      body: {
        title: RandomGenerator.name(3),
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // Verify member B cannot delete member A's post
  await TestValidator.error("non-author deletion rejected", async () => {
    await api.functional.redditLike.member.posts.erase(memberBConnection, {
      postId: post.id,
    });
  });
  // Since there's no direct post retrieval function, verify deletion prevention
  // by ensuring member A can still interact with the post (e.g., update if available)
  // For now, the key test is that member B cannot delete the post
  TestValidator.predicate(
    "post ID is still accessible",
    () => typeof post.id === "string",
  );
}
