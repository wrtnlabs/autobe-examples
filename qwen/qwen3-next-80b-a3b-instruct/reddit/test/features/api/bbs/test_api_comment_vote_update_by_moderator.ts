import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentVote";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_vote_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an actor-specific connection for moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate moderator using the provided utility function (mandatory)
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 3: Create a new comment vote using the moderator connection
  // Note: The endpoint for creating a comment vote is not provided in the available APIs,
  // but we need a vote to update. This scenario assumes the vote is created beforehand
  // in a real system. Since we cannot create a vote without an endpoint, we simulate
  // a vote by using typia.random to create a valid vote object.
  // In a real production environment, we would need a create endpoint.
  // For this test, we use a valid random vote structure assuming it was created previously.
  const commentVote = typia.random<ICommunityBbsCommentVote>();
  commentVote.vote_value = 1; // Set initial vote value to 1
  // Step 4: Update the comment vote using the moderator's connection
  const updatedVote =
    await api.functional.communityBbs.moderator.comment_votes.update(
      moderatorConnection,
      {
        voteId: commentVote.id,
        body: {
          vote_value: -1, // Change vote from 1 to -1
        } satisfies ICommunityBbsCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Step 5: Validate that the vote value was updated correctly
  TestValidator.equals("updated vote value", updatedVote.vote_value, -1);
  // Step 6: Validate that the vote ID remains the same
  TestValidator.equals("vote ID unchanged", updatedVote.id, commentVote.id);
  // Step 7: Validate that voter_id matches the moderator's user_id
  TestValidator.equals(
    "voter_id matches moderator user_id",
    updatedVote.voter_id,
    moderator.user_id,
  );
  // Step 8: Validate that the comment_id is preserved
  TestValidator.equals(
    "comment_id preserved",
    updatedVote.comment_id,
    commentVote.comment_id,
  );
  // Step 9: Validate that created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedVote.created_at,
    commentVote.created_at,
  );
}