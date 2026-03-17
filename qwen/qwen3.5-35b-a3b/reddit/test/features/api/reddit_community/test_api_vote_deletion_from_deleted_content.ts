import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_vote_deletion_from_deleted_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins the platform
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Member A creates a text post
  const post = await generate_random_reddit_community_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 5,
        }),
        post_type: "text" as const,
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 10,
          wordMax: 20,
        }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Member B joins the platform
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBAuth);
  // 4. Member B casts an upvote on Member A's post
  const vote = await generate_random_reddit_community_member_votes_create(
    memberBConnection,
    {
      body: {
        vote_type: "upvote" as const,
        target_post_id: post.id,
        target_comment_id: null,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(vote);
  const voteId: string & tags.Format<"uuid"> = vote.id;
  // 5. Member A deletes their post (removing the content)
  await api.functional.redditCommunity.member.posts.erase(memberAConnection, {
    postId: post.id,
  });
  // 6. Member B attempts to remove their vote from the deleted post
  // Expected: 404 Not Found with "Content no longer exists"
  await TestValidator.httpError(
    "vote deletion on deleted content returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.votes.erase(
        memberBConnection,
        {
          voteId: voteId,
        },
      );
    },
  );
}
