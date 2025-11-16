import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_post_vote_retrieval_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new registered user
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://reddit.example.com/signup",
    referrer: "https://reddit.example.com",
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Create a new reddit community post vote
  const createBody = {
    reddit_community_post_id: typia.random<string & tags.Format<"uuid">>(),
    vote_value: RandomGenerator.pick([1, -1] as const),
  } satisfies IRedditCommunityPostVote.ICreate;
  const createdVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdVote);

  // 3. Retrieve the created vote by ID
  const retrievedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.at(
      connection,
      { redditCommunityPostVoteId: createdVote.id },
    );
  typia.assert(retrievedVote);

  // 4. Verify the retrieved vote matches the created vote exactly
  TestValidator.equals(
    "vote ID should match",
    retrievedVote.id,
    createdVote.id,
  );
  TestValidator.equals(
    "user ID should match",
    retrievedVote.redditCommunityRegisteredUserId,
    createdVote.redditCommunityRegisteredUserId,
  );
  TestValidator.equals(
    "post ID should match",
    retrievedVote.redditCommunityPostId,
    createdVote.redditCommunityPostId,
  );
  TestValidator.equals(
    "vote value should match",
    retrievedVote.vote,
    createdVote.vote,
  );
  TestValidator.equals(
    "creation timestamp should match",
    retrievedVote.createdAt,
    createdVote.createdAt,
  );
  TestValidator.equals(
    "update timestamp should match",
    retrievedVote.updatedAt,
    createdVote.updatedAt,
  );

  // 5. Test unauthorized access by attempting to get the vote without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.at(
      unauthenticatedConnection,
      { redditCommunityPostVoteId: createdVote.id },
    );
  });
}
