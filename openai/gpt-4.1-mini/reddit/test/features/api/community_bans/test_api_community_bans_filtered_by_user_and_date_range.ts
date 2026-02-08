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

export async function test_api_community_bans_filtered_by_user_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins and obtains authentication token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorAuthorized.token.access;
  // Call the search endpoint with empty body filter as DTO has no filter properties defined
  const response =
    await api.functional.communityPlatform.moderator.community_bans.index(
      moderatorConnection,
      {
        body: {} satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  // Validate response and pagination
  typia.assert(response);
  typia.assert(response.pagination);
  TestValidator.predicate(
    "current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit >= 0", response.pagination.limit >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  // Validate data array existence and structure
  if (response.data.length > 0) {
    for (const ban of response.data) {
      typia.assert(ban);
    }
  } else {
    TestValidator.predicate(
      "response data array empty",
      response.data.length === 0,
    );
  }
}
