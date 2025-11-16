import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_vote_status_no_vote_cast(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a comment on a post without voting on it
  const communityCode: string = typia.random<string>();
  const postCode: string = typia.random<string>();
  const commentContent: string = RandomGenerator.paragraph({ sentences: 8 });
  const commentResponse: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.communities.posts.comments.create(
      connection,
      {
        communityCode,
        postCode,
        body: commentContent,
      },
    );
  typia.assert(commentResponse);
  const commentCode: string = commentResponse; // ICommunityPlatformComment is defined as string, so use it directly

  // 3. Retrieve the vote status for the comment (should be null since no vote was cast)
  const voteStatus: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.member.communities.posts.comments.votes.at(
      connection,
      {
        communityCode,
        postCode,
        commentCode,
      },
    );
  typia.assert(voteStatus);

  // 4. Validate that the vote status is null (indicating no vote was cast)
  TestValidator.equals(
    "vote status should be null for non-voting user",
    voteStatus,
    null,
  );
}
