import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";

export async function test_api_moderator_guest_search_invalid_pagination_params(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail satisfies IModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test invalid pagination parameters - page = 0
  await TestValidator.error(
    "invalid page value (0) should return 400",
    async () => {
      await api.functional.communityPlatform.moderator.guests.index(
        connection,
        {
          body: {
            page: 0,
            limit: 10,
          } satisfies ICommunityPlatformGuest.IRequest,
        },
      );
    },
  );

  // Step 3: Test invalid pagination parameters - limit > 100
  await TestValidator.error(
    "invalid limit value (150) should return 400",
    async () => {
      await api.functional.communityPlatform.moderator.guests.index(
        connection,
        {
          body: {
            page: 1,
            limit: 150,
          } satisfies ICommunityPlatformGuest.IRequest,
        },
      );
    },
  );

  // Step 4: Test invalid pagination parameters - limit = 0
  await TestValidator.error(
    "invalid limit value (0) should return 400",
    async () => {
      await api.functional.communityPlatform.moderator.guests.index(
        connection,
        {
          body: {
            page: 1,
            limit: 0,
          } satisfies ICommunityPlatformGuest.IRequest,
        },
      );
    },
  );

  // Step 5: Test invalid pagination parameters - limit = -5
  await TestValidator.error(
    "negative limit value (-5) should return 400",
    async () => {
      await api.functional.communityPlatform.moderator.guests.index(
        connection,
        {
          body: {
            page: 1,
            limit: -5,
          } satisfies ICommunityPlatformGuest.IRequest,
        },
      );
    },
  );
}
