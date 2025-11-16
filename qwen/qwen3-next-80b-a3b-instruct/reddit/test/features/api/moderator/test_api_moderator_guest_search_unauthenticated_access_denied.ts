import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";

export async function test_api_moderator_guest_search_unauthenticated_access_denied(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator to establish a valid session
  // This provides us with a properly authenticated connection
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: typia.random<IModerator.ICreate>(),
    });
  typia.assert(moderator);

  // Step 2: Create a fresh, unauthenticated connection to test access denial
  // We use a separate connection object with empty headers to simulate no authentication
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
  };

  // Step 3: Attempt to access guest records with unauthenticated connection
  // This must be denied with a 401 error because we've deliberately provided no authentication
  await TestValidator.error(
    "unauthenticated access to guest records should be denied",
    async () => {
      await api.functional.communityPlatform.moderator.guests.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 10,
            sortBy: "createdAt",
            sortOrder: "desc",
          } satisfies ICommunityPlatformGuest.IRequest,
        },
      );
    },
  );
}
