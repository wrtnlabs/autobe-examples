import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_community_moderator_registration_join_flow(
  connection: api.IConnection,
) {
  // 1. Successful communityModerator registration
  const newEmail = `user_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = `P@ssw0rd123!`;

  const authorized: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: newEmail,
          password: password,
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );

  typia.assert(authorized);

  TestValidator.predicate(
    "communityModerator join email format",
    /^[\w\d_-]+@example\.com$/i.test(authorized.email),
  );

  TestValidator.predicate(
    "communityModerator is_email_verified is false on join",
    authorized.is_email_verified === false,
  );

  TestValidator.predicate(
    "communityModerator created_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      authorized.created_at,
    ),
  );

  TestValidator.predicate(
    "communityModerator updated_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      authorized.updated_at,
    ),
  );

  // deleted_at can be null or undefined
  TestValidator.predicate(
    "communityModerator deleted_at can be null or undefined",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  typia.assert(authorized.token);

  TestValidator.predicate(
    "token.access is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token.expired_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      authorized.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "token.refreshable_until is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      authorized.token.refreshable_until,
    ),
  );

  // 2. Attempt to register with the same email again should error
  await TestValidator.error(
    "communityModerator join duplicate email error",
    async () => {
      await api.functional.auth.communityModerator.join.joinCommunityModerator(
        connection,
        {
          body: {
            email: newEmail,
            password: password,
          } satisfies IRedditCommunityCommunityModerator.IJoin,
        },
      );
    },
  );
}
