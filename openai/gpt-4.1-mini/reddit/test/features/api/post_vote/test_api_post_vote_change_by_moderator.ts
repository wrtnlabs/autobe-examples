import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_post_vote_change_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and get authenticated connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinData = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: "ModDisplay",
        bio: "Test moderator",
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorJoinData);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorJoinData.token.access;
  // Generate a random postId (simulate existing post)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Define a helper to get updated vote summary from the API call
  async function updateVote(voteType: string | null) {
    const body = { voteType } satisfies ICommunityPlatformPostVote.IUpdate;
    const voteSummary =
      await api.functional.communityPlatform.moderator.posts.votes.updateVote(
        moderatorConnection,
        { postId, body },
      );
    typia.assert(voteSummary);
    return voteSummary;
  }
  // 2. Initial upvote
  const initialUpvote = await updateVote("upvote");
  TestValidator.predicate(
    "initial upvote has nonnegative upvotes",
    initialUpvote.upvotes >= 1,
  );
  TestValidator.equals("initial downvotes zero", initialUpvote.downvotes, 0);
  // 3. Change vote to downvote
  const afterDownvote = await updateVote("downvote");
  TestValidator.predicate(
    "after changing to downvote, downvotes increased",
    afterDownvote.downvotes >= 1,
  );
  TestValidator.equals(
    "after changing to downvote, upvotes zero",
    afterDownvote.upvotes,
    0,
  );
  // 4. Change vote back to upvote
  const afterUpvoteAgain = await updateVote("upvote");
  TestValidator.predicate(
    "after changing back to upvote, upvotes increased",
    afterUpvoteAgain.upvotes >= 1,
  );
  TestValidator.equals(
    "after changing back to upvote, downvotes zero",
    afterUpvoteAgain.downvotes,
    0,
  );
  // 5. Remove vote
  const afterRemove = await updateVote(null);
  TestValidator.equals(
    "after removing vote, upvotes zero",
    afterRemove.upvotes,
    0,
  );
  TestValidator.equals(
    "after removing vote, downvotes zero",
    afterRemove.downvotes,
    0,
  );
  // 6. Repeat voting to ensure consistent results
  const repeat1 = await updateVote("upvote");
  const repeat2 = await updateVote("downvote");
  const repeat3 = await updateVote(null);
  TestValidator.predicate("repeat1 upvotes nonnegative", repeat1.upvotes >= 1);
  TestValidator.equals("repeat1 downvotes zero", repeat1.downvotes, 0);
  TestValidator.predicate(
    "repeat2 downvotes nonnegative",
    repeat2.downvotes >= 1,
  );
  TestValidator.equals("repeat2 upvotes zero", repeat2.upvotes, 0);
  TestValidator.equals("repeat3 reset votes", repeat3.upvotes, 0);
  TestValidator.equals("repeat3 reset votes", repeat3.downvotes, 0);
  // 7. Verify unauthenticated moderator is rejected
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated moderator vote update",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.posts.votes.updateVote(
        unauthenticatedConnection,
        { postId, body: { voteType: "upvote" } },
      );
    },
  );
  // 8. Simulate banned moderator rejection if possible
  // Since no banning API exists in given info, skip
}
