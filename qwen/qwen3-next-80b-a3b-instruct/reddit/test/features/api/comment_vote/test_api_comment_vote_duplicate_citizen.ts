import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSComment";
import type { ICommunityBBSCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommentVote";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";

export async function test_api_comment_vote_duplicate_citizen(
  connection: api.IConnection,
) {
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: typia.random<ICommunityBBSPost.ICreate>(),
    });
  typia.assert(post);

  const comment: ICommunityBBSComment =
    await api.functional.communityBBS.citizen.comments.create(connection, {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityBBSComment.ICreate,
    });
  typia.assert(comment);

  const firstVote: ICommunityBBSCommentVote =
    await api.functional.communityBBS.citizen.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: { type: "upvote" } satisfies ICommunityBBSCommentVote.ICreate,
      },
    );
  typia.assert(firstVote);

  await TestValidator.httpError(
    "duplicate vote should return 409 Conflict",
    409,
    async () => {
      await api.functional.communityBBS.citizen.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: { type: "downvote" } satisfies ICommunityBBSCommentVote.ICreate,
        },
      );
    },
  );
}
