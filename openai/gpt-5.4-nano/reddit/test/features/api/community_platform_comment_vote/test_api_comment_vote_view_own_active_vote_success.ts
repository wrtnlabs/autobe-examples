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

export async function test_api_comment_vote_view_own_active_vote_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);

  const fixtures = (
    globalThis as unknown as {
      __communityPlatformFixtures?: {
        commentVoteOwnActive?: {
          postId: string & tags.Format<"uuid">;
          commentId: string & tags.Format<"uuid">;
          voteId: string & tags.Format<"uuid">;
          stored?: {
            voteDirection: number & tags.Type<"int32">;
            votedAt: string & tags.Format<"date-time">;
            deletedAt: (string & tags.Format<"date-time">) | null;
          };
        };
      };
    }
  ).__communityPlatformFixtures?.commentVoteOwnActive;

  TestValidator.predicate(
    "fixture exists",
    fixtures !== null && fixtures !== undefined,
  );

  if (fixtures === null || fixtures === undefined) {
    throw new Error("fixture exists assertion failed");
  }

  const stored = fixtures.stored ?? {
    voteDirection: typia.random<number & tags.Type<"int32">>(),
    votedAt: new Date().toISOString() as string & tags.Format<"date-time">,
    deletedAt: null,
  };

  const output =
    await api.functional.communityPlatform.member.posts.comments.votes.at(
      memberConnection,
      {
        postId: fixtures.postId,
        commentId: fixtures.commentId,
        voteId: fixtures.voteId,
      },
    );
  typia.assert(output);

  TestValidator.equals(
    "voteDirection matches stored",
    output.voteDirection,
    stored.voteDirection,
  );
  TestValidator.equals(
    "votedAt matches stored",
    output.votedAt,
    stored.votedAt,
  );
  TestValidator.equals("deletedAt is null", output.deletedAt, null);
  TestValidator.equals(
    "voter.id matches authenticated member",
    output.voter.id,
    member.id,
  );
  TestValidator.equals(
    "voter.display_name is non-empty",
    output.voter.display_name.length > 0,
    true,
  );
}
