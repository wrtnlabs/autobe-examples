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

export async function test_api_comment_vote_delete_after_repeated_vote(
  connection: api.IConnection,
) {
  // 1. Create citizen account for voting
  const citizenInfo = typia.random<ICommunityBBSCitizenICreate>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: citizenInfo,
    });
  typia.assert(citizen);

  // 2. Create a post to host the comment
  const post = await api.functional.communityBBS.citizen.posts.create(
    connection,
    {
      body: typia.random<ICommunityBBSPost.ICreate>(),
    },
  );
  typia.assert(post);

  // 3. Create a comment on the post
  const comment = await api.functional.communityBBS.citizen.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityBBSComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Submit an upvote on the comment
  const upvote =
    await api.functional.communityBBS.citizen.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          type: "upvote",
        } satisfies ICommunityBBSCommentVote.ICreate,
      },
    );
  typia.assert(upvote);

  // 5. Delete the vote (first deletion)
  await api.functional.communityBBS.citizen.comments.votes.erase(connection, {
    commentId: comment.id,
  });

  // 6. Attempt to delete the same vote again (second deletion attempt)
  // System should reject this with a 404 error since the vote is already deleted
  await TestValidator.error(
    "cannot delete vote that was already deleted",
    async () => {
      await api.functional.communityBBS.citizen.comments.votes.erase(
        connection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
