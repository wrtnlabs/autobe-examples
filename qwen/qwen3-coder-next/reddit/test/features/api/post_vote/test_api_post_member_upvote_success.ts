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

export async function test_api_post_member_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: `testuser_${typia.random<string & tags.Format<"uuid">>()}`,
      displayName: null,
    },
  });
  typia.assert(member);
  // 2. Create target post
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Upvote the post (success case)
  const vote = await api.functional.redditClone.member.posts.upvote(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  // 4. Validate vote
  TestValidator.equals("vote value is upvote", vote.vote_value, 1);
  TestValidator.predicate("vote has id", typeof vote.id === "string");
  TestValidator.predicate(
    "vote has created_at",
    typeof vote.created_at === "string",
  );
  TestValidator.predicate(
    "vote has updated_at",
    typeof vote.updated_at === "string",
  );
}
