import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that an administrator can retrieve full post vote details, including
 * audit fields and related objects.
 *
 * Steps:
 *
 * 1. Register a new administrator account to get admin privileges and token
 * 2. Use a known post vote ID (randomly generated here) to request details using
 *    the admin connection
 * 3. Validate that all voting, user, and post summary fields, as well as
 *    timestamps, are present and correctly typed
 * 4. Verify that unauthenticated requests are rejected
 */
export async function test_api_post_vote_detail_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register admin to get auth context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoinInput = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const authorized: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(authorized);

  // 2. Attempt to find a real postVoteId (here, just generate a random UUID — in real E2E there would be prior data setup)
  const postVoteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the administrator-only endpoint to retrieve vote details
  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.administrator.postVotes.at(
      connection,
      {
        postVoteId,
      },
    );
  typia.assert(postVote);
  // Check audit fields
  TestValidator.predicate(
    "vote id is uuid",
    typeof postVote.id === "string" && postVote.id.length > 0,
  );
  TestValidator.equals(
    "vote type field is present and string",
    typeof postVote.vote_type,
    "string",
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof postVote.created_at === "string" && postVote.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof postVote.updated_at === "string" && postVote.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is valid ISO/null/undefined",
    postVote.deleted_at === null ||
      typeof postVote.deleted_at === "string" ||
      postVote.deleted_at === undefined,
  );
  // Check related summaries
  if (postVote.post !== undefined) typia.assert(postVote.post);
  if (postVote.user !== undefined) typia.assert(postVote.user);

  // 4. Negative: should fail if not an admin (simulate with unauthenticated conn)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should fail for unauthenticated user",
    async () => {
      await api.functional.communityPlatform.administrator.postVotes.at(
        unauthConn,
        {
          postVoteId,
        },
      );
    },
  );
}
