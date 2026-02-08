import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_bans_unfiltered_full_list(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authenticate as a moderator by joining, then retrieve the full list of community bans without any filtering.
  // 1. Create a new moderator connection and join to authenticate.
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Using empty body since ICommunityPlatformModerator.IJoin is empty type
  const auth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(auth);
  // Update connection headers to include the access token for authorization.
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = `Bearer ${auth.token.access}`;
  // 2. Request unfiltered community bans list (empty filter object).
  const body: ICommunityPlatformCommunityBan.IRequest = {};
  const result =
    await api.functional.communityPlatform.moderator.community_bans.index(
      moderatorConnection,
      { body },
    );
  // 3. Assert response shape and data.
  typia.assert(result);
  // 4. Validate pagination information exists and has positive limit.
  TestValidator.predicate(
    "pagination current page is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  // 5. Validate that data array is present.
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // 6. Verify unauthorized access forbidden.
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.communityPlatform.moderator.community_bans.index(
      anonymousConnection,
      { body },
    );
  });
}
