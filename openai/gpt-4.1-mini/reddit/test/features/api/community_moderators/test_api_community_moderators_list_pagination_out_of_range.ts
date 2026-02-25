import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_moderators_list_pagination_out_of_range(
  connection: api.IConnection,
): Promise<void> {
  // Test edge case of paginating community moderators with a page number beyond the last available page.
  // 1. Moderator join and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "mod_" + RandomGenerator.alphabets(6),
      displayName: "Mod " + RandomGenerator.name(1),
      bio: null,
      avatarUrl: null,
    },
  });
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Request with very high page number to trigger out-of-range pagination
  const highPageNumber = 1000000 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const requestBody = {
    page: highPageNumber,
    limit: limit,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;
  const response = await api.functional.communityPlatform.moderators.index(
    moderatorConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // 3. Validate response structure
  // Response data array should be empty
  TestValidator.predicate(
    "data array is empty for out-of-range page",
    response.data.length === 0,
  );
  // Pagination current page must equal requested page
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    highPageNumber,
  );
  // Pagination limit must equal requested limit
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    limit,
  );
  // Pages should be >= current page (since no data, pages may be zero or smaller than current, but must be zero or more)
  TestValidator.predicate(
    "pagination pages is zero or less than requested page",
    response.pagination.pages >= 0,
  );
  // Total records can be zero or more
  TestValidator.predicate(
    "pagination total record count is non-negative",
    response.pagination.records >= 0,
  );
  // No errors expected, API should handle gracefully
}
