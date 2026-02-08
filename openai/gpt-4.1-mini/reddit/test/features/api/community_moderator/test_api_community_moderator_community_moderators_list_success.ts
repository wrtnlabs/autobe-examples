import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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

export async function test_api_community_moderator_community_moderators_list_success(
  connection: api.IConnection,
) {
  // 1. Moderator joins and is authorized
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResponse = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(moderatorJoinResponse);
  moderatorConnection.headers = {
    ...moderatorConnection.headers,
    Authorization: `Bearer ${moderatorJoinResponse.token.access}`,
  };
  // 2. Retrieve paginated list of community moderators with empty filter
  const response =
    await api.functional.communityPlatform.moderator.communityModerators.index(
      moderatorConnection,
      {
        body: {} satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation correctness",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate all returned moderators are active and have profile summaries
  for (const moderator of response.data) {
    // Since schema for ISummary is empty, we can only validate that it exists
    typia.assert(moderator);
  }
}
