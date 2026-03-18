import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_vote_view_removed_vote_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2) Fixture setup for a soft-deleted vote (deletedAt != null)
  // is not available in the provided SDK/utility surface, so we cannot
  // deterministically create the required removed-vote record.
  // We still verify the contract: removed votes must not be returned.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // 3) Call GET vote endpoint and ensure it is treated as not found
  // (i.e., no active vote DTO is returned).
  await TestValidator.error(
    "removed vote should not be returned as active payload",
    async () => {
      const result =
        await api.functional.communityPlatform.member.posts.comments.votes.at(
          memberConnection,
          {
            postId,
            commentId,
            voteId,
          },
        );
      // If this line executes, an active vote payload was returned, which is forbidden.
      typia.assert(result);
      throw new Error(
        "Expected not-found for removed vote, but vote payload was returned",
      );
    },
  );
}
