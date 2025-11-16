import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate rejection when voting on a non-existent post.
 *
 * Business goal
 *
 * - Ensure that the "create/update vote" endpoint does not allow an authenticated
 *   member user to vote on a post that does not exist.
 * - Confirm that the failure is attributed to the invalid post identifier, not to
 *   authentication or payload-shape problems.
 *
 * Test flow
 *
 * 1. Register a new community platform member user using the join endpoint.
 *
 *    - Use a realistic ICommunityPlatformMemberuser.IJoin payload.
 *    - Rely on the SDK to attach the bearer token into the connection.
 * 2. Generate a syntactically valid UUID to represent a non-existent postId.
 *
 *    - This UUID must only satisfy the uuid format; we do not create any post in
 *         this test, so it should not map to an existing post row.
 * 3. Call POST /communityPlatform/memberUser/posts/{postId}/votes through
 *    api.functional.communityPlatform.memberUser.posts.votes.create.
 *
 *    - Use the random UUID as postId.
 *    - Provide a valid ICommunityPlatformPostVote.ICreate body with a reasonable
 *         direction value like "up".
 * 4. Assert that the call fails.
 *
 *    - Use TestValidator.error with an async closure, and await it.
 *    - Do not assert on a particular HTTP status code or error message, only that an
 *         error occurs.
 * 5. Do not attempt any follow-up read of a vote, because the write operation must
 *    not succeed when the post does not exist.
 */
export async function test_api_post_vote_reject_vote_on_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Register a new member user so that the connection is authenticated
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional; we omit it to let server derive from transport
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Generate a syntactically valid, random UUID for a non-existent post
  const nonexistentPostId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare a valid vote creation body with a reasonable direction
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  // 4. Attempt to create the vote and assert that it fails
  await TestValidator.error(
    "voting on a non-existent post must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId: nonexistentPostId,
          body: voteBody,
        },
      );
    },
  );
}
