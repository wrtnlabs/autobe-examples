import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_post_member_vote_change_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  memberConnection.headers = { Authorization: memberUser.token.access };
  // 2. Create a post
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Downvote the post
  const downvoteResponse =
    await api.functional.redditClone.member.posts.downvote(memberConnection, {
      postId: post.id,
    });
  typia.assert(downvoteResponse);
  // 4. Change vote to upvote (should replace downvote with upvote)
  const upvoteResponse = await api.functional.redditClone.member.posts.upvote(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(upvoteResponse);
  // 5. Validate the vote is now an upvote
  TestValidator.equals(
    "vote_value should be 1 (upvote)",
    upvoteResponse.vote_value,
    1,
  );
}
