import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_comment_vote_create_unauthenticated_moderator_error(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a moderator to establish valid credentials but not use them in the test
  const moderatorJoinData: IModerator.ICreate =
    typia.random<IModerator.ICreate>();
  const authenticatedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Create an unauthenticated connection by clearing headers (no token)
  // This simulates an attempt to access the vote endpoint without a JWT token
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Attempt to create a comment vote without authentication
  // The system must reject this with a 401 Unauthorized error
  await TestValidator.error(
    "unauthenticated moderator vote creation must return 401 Unauthorized",
    async () => {
      await api.functional.communityPlatform.moderator.communities.posts.comments.votes.create(
        unauthenticatedConnection,
        {
          communityCode: typia.random<string>(),
          postCode: typia.random<string>(),
          commentCode: typia.random<string>(),
          body: {
            vote_type: "upvote",
          } satisfies ICommunityPlatformCommentVote.IRequest,
        },
      );
    },
  );
}
