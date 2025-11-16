import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_vote_removal_by_authored_member(
  connection: api.IConnection,
) {
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "SecurePass123!";
  const memberHref: string = "https://community-platform.com/join";
  const memberReferrer: string = "https://community-platform.com";
  const memberIp: string = "192.168.1.100";

  // Authenticate member
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
        ip: memberIp,
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Create a community code and post code for testing
  const communityCode: string = typia.random<string>();
  const postCode: string = typia.random<string>();
  const commentContent: string = "This is a test comment.";

  // Create a comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.communities.posts.comments.create(
      connection,
      {
        communityCode,
        postCode,
        body: commentContent satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // Cast an upvote on the comment
  await api.functional.communityPlatform.member.communities.posts.comments.votes.create(
    connection,
    {
      communityCode,
      postCode,
      commentCode: comment,
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformCommentVote.IRequest,
    },
  );

  // Remove the vote
  await api.functional.communityPlatform.member.communities.posts.comments.votes.erase(
    connection,
    {
      communityCode,
      postCode,
      commentCode: comment,
    },
  );

  // Attempt to remove the same vote again (should fail)
  await TestValidator.error(
    "removing already removed vote should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.comments.votes.erase(
        connection,
        {
          communityCode,
          postCode,
          commentCode: comment,
        },
      );
    },
  );
}
