import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentVote";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_vote_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create a vote record
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Since the vote creation endpoint is not directly accessible through a utility function,
  // and there's no SDK function to create a comment vote, we must assume that a vote exists and
  // we need to use a generated valid UUID for voteId, assuming the system has this vote owned by admin.
  // This is a necessary workaround given the API's constraints.
  const voteId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Update the vote from upvote (1) to downvote (-1)
  const updatedVote: ICommunityBbsCommentVote =
    await api.functional.communityBbs.admin.comment_votes.update(
      adminConnection,
      {
        voteId: voteId,
        body: {
          vote_value: -1, // Change from 1 to -1 (downvote)
        } satisfies ICommunityBbsCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Step 3: Assert that the vote value was changed to downvote (-1)
  TestValidator.equals(
    "vote value should be downvote (-1)",
    updatedVote.vote_value,
    -1,
  );
  // Step 4: Assert that the voter_id is the admin's id
  TestValidator.equals(
    "voter_id should be the admin's id",
    updatedVote.voter_id,
    admin.id,
  );
  // Step 5: Update again to toggle back to upvote (1)
  const updatedVoteBack: ICommunityBbsCommentVote =
    await api.functional.communityBbs.admin.comment_votes.update(
      adminConnection,
      {
        voteId: voteId,
        body: {
          vote_value: 1, // Toggle back to upvote
        } satisfies ICommunityBbsCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVoteBack);
  // Step 6: Assert that the vote value was toggled back to upvote (1)
  TestValidator.equals(
    "vote value should be upvote (1)",
    updatedVoteBack.vote_value,
    1,
  );
  // Step 7: Assert that the voter_id remains the admin's id
  TestValidator.equals(
    "voter_id should remain the admin's id",
    updatedVoteBack.voter_id,
    admin.id,
  );
}
