import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_vote } from "../../../generate/generate_random_reddit_platform_member_posts_vote";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member 1: Authenticate to cast votes
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Member 2: Authenticate to create the post
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. Member 2 creates a post
  const post = await api.functional.redditPlatform.member.posts.create(
    member2Connection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({
          paragraphs: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Member 1 casts upvote
  const upvote = await api.functional.redditPlatform.member.posts.vote(
    member1Connection,
    {
      postId: post.id,
      body: {
        vote_type: "up" as const,
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  typia.assert(upvote);
  // Validate upvote state
  TestValidator.equals("upvote direction", upvote.vote_type, "up");
  TestValidator.equals(
    "upvotes count after upvote",
    upvote.post.upvotes_count,
    1,
  );
  TestValidator.equals(
    "downvotes count after upvote",
    upvote.post.downvotes_count,
    0,
  );
  TestValidator.equals("upvote score", upvote.post.upvotes_count - upvote.post.downvotes_count, 1);
  // 5. Member 1 changes vote from upvote to downvote
  const downvote = await api.functional.redditPlatform.member.posts.vote(
    member1Connection,
    {
      postId: post.id,
      body: {
        vote_type: "down" as const,
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  typia.assert(downvote);
  // 6. Validate vote change
  TestValidator.equals("downvote direction", downvote.vote_type, "down");
  TestValidator.notEquals(
    "upvote changed to downvote",
    upvote.vote_type,
    downvote.vote_type,
  );
  TestValidator.equals(
    "upvotes count after downvote",
    downvote.post.upvotes_count,
    0,
  );
  TestValidator.equals(
    "downvotes count after downvote",
    downvote.post.downvotes_count,
    1,
  );
  TestValidator.equals("downvote score", downvote.post.downvotes_count - downvote.post.upvotes_count, -1);
  TestValidator.notEquals(
    "updated_at changed after vote change",
    upvote.updated_at,
    downvote.updated_at,
  );
  // 7. Verify only one vote record exists (single vote per post constraint)
  // Note: Cannot verify vote count from IRedditPlatformPostVote response type
  // 8. Verify author karma after vote change
  TestValidator.equals(
    "author karma reflects vote change (0 after upvote/downvote)",
    downvote.author.karma,
    0,
  );
}