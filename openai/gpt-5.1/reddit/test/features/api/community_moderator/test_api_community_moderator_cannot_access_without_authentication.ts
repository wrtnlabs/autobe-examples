import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";

/**
 * Verify that community moderator moderation action details cannot be fetched
 * without authentication.
 *
 * Business context: Moderation actions contain sensitive enforcement
 * information (who acted, why, and against which report/community). The
 * /communityPlatform/communityModerator/moderationActions/{moderationActionId}
 * endpoint must therefore only be accessible to authenticated moderator (or
 * platform admin) actors. Anonymous callers must receive an authentication
 * error and must not learn whether a given moderation action ID exists.
 *
 * Test steps:
 *
 * 1. Register a community moderator using the public join endpoint. This both
 *    provisions a moderator account and configures the shared SDK connection
 *    with an Authorization header via the join() helper.
 * 2. Derive an unauthenticated connection by shallow-cloning the provided
 *    connection and overriding headers with an empty object literal. This
 *    creates a connection with no Authorization header without manually
 *    mutating headers after creation.
 * 3. Generate a random UUID to use as moderationActionId. The existence of a real
 *    moderation action record is not required for this authentication test.
 * 4. Call the moderation action detail endpoint using the unauthenticated
 *    connection and the random moderationActionId.
 * 5. Assert that the call fails with an HTTP 401 Unauthorized error using
 *    TestValidator.httpError, which is specialized for HTTP status validation.
 *    We only assert the status code, not the error body structure.
 */
export async function test_api_community_moderator_cannot_access_without_authentication(
  connection: api.IConnection,
) {
  // 1. Register a community moderator, primarily to mirror realistic flows
  //    and to ensure the main connection is configured for authenticated
  //    operations (even though this particular scenario will use an
  //    unauthenticated clone for the core assertion).
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderator);

  // 2. Create an unauthenticated connection by resetting headers. We only
  //    construct this once and never touch headers afterwards, in line
  //    with the SDK header management rules.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Prepare a random moderationActionId. Existence is irrelevant for
  //    this test; we only validate authentication behavior.
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  // 4 & 5. Invoke the moderation action detail endpoint without
  //    authentication and assert that an HTTP 401 Unauthorized error is
  //    thrown.
  await TestValidator.httpError(
    "community moderator moderation action detail requires authentication",
    401,
    async () => {
      await api.functional.communityPlatform.communityModerator.moderationActions.at(
        unauthenticatedConnection,
        {
          moderationActionId,
        },
      );
    },
  );
}
