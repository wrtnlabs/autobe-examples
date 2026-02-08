import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_reports_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // Scenario 1: Retrieve post reports list with no filters
  const emptyFilterBody: ICommunityPlatformPostReport.IRequest = {};
  const response =
    await api.functional.communityPlatform.moderator.post_reports.index(
      moderatorConnection,
      { body: emptyFilterBody },
    );
  typia.assert(response);
  // Validate pagination defaults
  TestValidator.predicate(
    "pagination current is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is greater than 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is not negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Validate each item in data array structure (required summary fields)
  for (const report of response.data) {
    typia.assert(report);
  }
}
