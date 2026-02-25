import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarma";
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

export async function test_api_karma_record_vote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join new user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.redditClone.auth.member.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(user);
  // 2. Create a post (using a placeholder community_id since we can't create communities)
  const post = await api.functional.redditClone.member.posts.create(
    userConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Initial upvote
  const upvote = await api.functional.redditClone.member.posts.upvote(
    userConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(upvote);
  // 4. Get karma record (upvote applied)
  const karmaAfterUpvote = await api.functional.redditClone.karmas.at(
    userConnection,
    {
      karmaId: user.id,
    },
  );
  typia.assert(karmaAfterUpvote);
  // 5. Change vote to downvote
  const downvote = await api.functional.redditClone.member.posts.downvote(
    userConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(downvote);
  // 6. Get karma record (vote changed, net -2 karma change)
  const karmaAfterDownvote = await api.functional.redditClone.karmas.at(
    userConnection,
    {
      karmaId: user.id,
    },
  );
  typia.assert(karmaAfterDownvote);
  // 7. Validate vote change karma adjustment
  // Upvote gave +1, changing to downvote removes +1 and adds -1 = net -2
  TestValidator.equals(
    "score changed by -2",
    karmaAfterDownvote.totalScore,
    karmaAfterUpvote.totalScore - 2,
  );
  TestValidator.equals(
    "score change is -2",
    karmaAfterDownvote.scoreChange,
    -2,
  );
}
