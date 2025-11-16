import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_vote_status_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "ValidPassword123!@#",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a valid comment to establish comment codes for testing
  const communityCode = "community-123";
  const postCode = "post-456";
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.communities.posts.comments.create(
      connection,
      {
        communityCode,
        postCode,
        body: "This is a valid comment for testing purpose." satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Retain the valid comment code from step 2
  const validCommentCode = comment; // Using the valid comment code for context

  // 4. Use a non-existent comment code for the test
  const nonExistentCommentCode = "non-existent-comment-789";

  // 5. Attempt to retrieve vote status on non-existent comment
  // The system should return a 404 Not Found error when attempt is made
  await TestValidator.error(
    "attempting to retrieve vote status on non-existent comment should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.comments.votes.at(
        connection,
        {
          communityCode,
          postCode,
          commentCode: nonExistentCommentCode,
        },
      );
    },
  );

  // 6. Verify the process completes without error for the valid comment
  // This confirms our environment setup is correct and the error is specific to non-existent comment
  const validVote =
    await api.functional.communityPlatform.member.communities.posts.comments.votes.at(
      connection,
      {
        communityCode,
        postCode,
        commentCode: validCommentCode,
      },
    );
  typia.assert(validVote);

  // 7. Final assertion: Ensure the valid vote status is successfully retrieved
  TestValidator.equals(
    "valid comment vote status should be retrievable",
    typeof validVote,
    "string",
  );
}
