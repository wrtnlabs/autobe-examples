import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_votes_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_vote_self_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a single member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/",
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(member);
  // 2. Create a post as this member
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);
  // 3. Create a comment on the post as the same member
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Attempt to cast an upvote on the member's own comment (should be forbidden)
  await TestValidator.error("self-vote forbidden", async () => {
    await api.functional.redditCommunity.member.posts.comments.votes.create(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  });
}
