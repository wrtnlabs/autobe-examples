import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_vote_status_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "StrongPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Use the authenticated connection (token is automatically handled by SDK)

  // Step 3: Create a community, post, and comment to retrieve vote status on
  // Note: The API doesn't provide a direct way to create community, so we use a random string as communityCode
  const communityCode: string = RandomGenerator.alphaNumeric(8);
  const postCode: string = RandomGenerator.alphaNumeric(8);
  const commentContent: string = RandomGenerator.paragraph({ sentences: 5 });

  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.communities.posts.comments.create(
      connection,
      {
        communityCode,
        postCode,
        body: commentContent satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // Step 4: Retrieve the member's current vote status on the comment
  // This API endpoint (PATCH) is used to retrieve vote status
  // Response type: ICommunityPlatformCommentVote (string)
  const voteStatus: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.member.communities.posts.comments.votes.at(
      connection,
      {
        communityCode,
        postCode,
        commentCode: createdComment, // FIX: Use direct string value, not cast
      },
    );
  typia.assert(voteStatus);

  // Step 5: Validate the vote status response structure
  // Since ICommunityPlatformCommentVote is defined as string,
  // we validate it's the correct type and structure
  TestValidator.equals("vote status is a string", typeof voteStatus, "string");

  // We cannot test vote content (upvote/downvote) because we didn't cast a vote,
  // and no API exists to create a vote.
  // Therefore, we only validate response type and successful retrieval.
}
