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
import type { IRedditPlatformPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVoteStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve vote status showing no vote has been cast.
 *
 * Validates the complete workflow of checking vote status before any vote is cast. Creates a member account through registration, publishes a post as that member, and verifies the vote status endpoint returns null values indicating no vote exists. This test ensures the API correctly represents the absence of votes.
 *
 * Special attention is given to verifying that both voteType and voteTimestamp are null, confirming the member has not interacted with the post's voting system. The test uses the post ID from the created post and validates it matches the response.
 *
 * 1. Register and authenticate a new member via /auth/member/join.
 * 2. Member creates a text post to have content for voting.
 * 3. Check vote status using GET /member/posts/{postId}/vote before casting any vote.
 * 4. Validates response shows voteType: null (no vote cast).
 * 5. Validates response shows voteTimestamp: null (no vote cast).
 * 6. Validates response includes correct postId from path parameter.
 * 7. After this test, member should still be able to cast a vote on this post.
 */
export async function test_api_post_vote_status_no_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a post for the member
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Check vote status BEFORE casting any vote
  const voteStatus = await api.functional.redditPlatform.member.posts._vote.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(voteStatus);
  // 4. Validate vote status shows no vote has been cast
  TestValidator.equals("postId matches", voteStatus.postId, post.id);
  TestValidator.equals("voteType is null", voteStatus.voteType, null);
  TestValidator.equals("voteTimestamp is null", voteStatus.voteTimestamp, null);
}
