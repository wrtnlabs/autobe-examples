import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_vote_create_unauthenticated_guest_error(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "unauthenticated guest cannot vote on comment",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.comments.votes.create(
        connection,
        {
          communityCode: RandomGenerator.alphaNumeric(16),
          postCode: RandomGenerator.alphaNumeric(16),
          commentCode: RandomGenerator.alphaNumeric(16),
          body: {
            vote_type: "upvote",
          } satisfies ICommunityPlatformCommentVote.IRequest,
        },
      );
    },
  );
}
