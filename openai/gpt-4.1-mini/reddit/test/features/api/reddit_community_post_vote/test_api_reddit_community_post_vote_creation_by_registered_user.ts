import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_post_vote_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Create a fresh registered user with unique email, valid password, and session info
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email,
        password: "strongPa$word123",
        ip: null,
        href: "https://example.com/current",
        referrer: "https://example.com/referrer",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });

  // Validate response
  typia.assert(registeredUser);

  // 2. Create a new reddit community post vote with vote_value either 1 or -1
  const voteValue: -1 | 1 = RandomGenerator.pick([-1, 1] as const);
  const redditCommunityPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const postVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.create(
      connection,
      {
        body: {
          reddit_community_post_id: redditCommunityPostId,
          vote_value: voteValue,
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );

  typia.assert(postVote);

  // 3. Attempt to create a duplicate vote on the same post by the same user, expect error
  await TestValidator.error("duplicate vote creation should fail", async () => {
    await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.create(
      connection,
      {
        body: {
          reddit_community_post_id: redditCommunityPostId,
          vote_value: voteValue,
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  });

  // 4. Verify authentication is enforced by trying unauthorized request
  // We create a new connection without auth headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated vote creation should fail",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.create(
        unauthenticatedConnection,
        {
          body: {
            reddit_community_post_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            vote_value: RandomGenerator.pick([-1, 1] as const),
          } satisfies IRedditCommunityPostVote.ICreate,
        },
      );
    },
  );
}
