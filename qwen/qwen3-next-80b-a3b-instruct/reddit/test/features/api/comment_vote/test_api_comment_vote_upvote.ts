import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVoteRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVoteRequest";
import type { IRedditCommunityCommentVoteResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVoteResponse";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_vote_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for comment author
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberUsername = RandomGenerator.name(1);
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwnerEmail = typia.random<string & tags.Format<"email">>();
  const communityOwnerPassword = RandomGenerator.alphaNumeric(16);
  const communityOwnerDisplayName = RandomGenerator.name();
  const communityOwner: IRedditCommunityCommunityOwner.IAuthorized =
    await authorize_community_owner_join(communityOwnerConnection, {
      body: {
        email: communityOwnerEmail,
        password: communityOwnerPassword,
        displayName: communityOwnerDisplayName,
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    });
  // 3. Use the same connection for community owner operations - it's already authenticated from join
  // No need for separate login - the join function already set up the auth headers
  // 4. Create community owned by community owner
  const community =
    await generate_random_reddit_community_member_communities_create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  // 5. Login as member to create post (using correct credentials from step 1)
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 6. Create post in the community by member
  const post = await generate_random_reddit_community_member_posts_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  // 7. Create comment on the post by member
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberLoginConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  // 8. Verify that the comment author is not the community owner (ensures no self-voting)
  TestValidator.notEquals(
    "comment author is not community owner",
    comment.author.id,
    communityOwner.id,
  );
  // 9. Save initial comment vote_score and community owner karma_score
  const initialCommentVoteScore = comment.vote_score;
  const initialCommunityOwnerKarmaScore = communityOwner.karma_score;
  // 10. Upvote the comment as community owner (using authenticated communityOwnerConnection)
  const voteResponse =
    await api.functional.redditCommunity.communityOwner.posts.comments.votes.create(
      communityOwnerConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          voteType: "upvote",
        } satisfies IRedditCommunityCommentVoteRequest,
      },
    );
  typia.assert(voteResponse);
  // 11. Verify that comment vote_score increased by 1
  TestValidator.equals(
    "comment vote_score increased by 1",
    voteResponse.vote_score,
    initialCommentVoteScore + 1,
  );
  // 12. Fetch updated community owner profile using the same authenticated connection
  // The communityOwnerConnection is already authenticated, so we can query their profile
  const updatedCommunityOwner =
    await api.functional.redditCommunity.auth.community_owner.login(
      communityOwnerConnection,
      {
        body: {
          email: communityOwnerEmail,
          password: communityOwnerPassword,
        } satisfies IRedditCommunityCommunityOwner.ILogin,
      },
    );
  typia.assert(updatedCommunityOwner);
  TestValidator.equals(
    "community owner karma_score increased by 1",
    updatedCommunityOwner.karma_score,
    initialCommunityOwnerKarmaScore + 1,
  );
}
