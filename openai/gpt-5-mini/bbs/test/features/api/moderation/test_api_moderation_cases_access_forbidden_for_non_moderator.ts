import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumModerationCase";

/**
 * Verify non-moderator access is forbidden to moderator moderationCases
 * listing.
 *
 * Business purpose:
 *
 * - Ensure that the moderator listing endpoint is protected by role-based access
 *   control and that regular registered users cannot retrieve moderator-only
 *   moderation case listings.
 *
 * Steps:
 *
 * 1. Create a regular registered user via POST /auth/registeredUser/join.
 * 2. Attempt to call PATCH /econPoliticalForum/moderator/moderationCases using the
 *    authenticated regular user.
 * 3. Expect an HTTP authorization error (401 or 403). Use TestValidator.httpError
 *    to validate the failure.
 */
export async function test_api_moderation_cases_access_forbidden_for_non_moderator(
  connection: api.IConnection,
) {
  // 1) Create a normal registered user and obtain authorization
  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: typia.random<IEconPoliticalForumRegisteredUser.IJoin>(),
    });
  // validate the shape of the authorized response
  typia.assert(registered);

  // 2) Attempt to call the moderator endpoint as a regular (non-moderator) user
  // Use minimal paging request: { page: 1, limit: 10 }
  await TestValidator.httpError(
    "non-moderator cannot access moderation cases", // descriptive title
    [401, 403],
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationCases.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IEconPoliticalForumModerationCase.IRequest,
        },
      );
    },
  );

  // Note: No explicit teardown API available in provided SDK. Test infra
  // (CI or test DB reset) is expected to clean up test data between runs.
}
