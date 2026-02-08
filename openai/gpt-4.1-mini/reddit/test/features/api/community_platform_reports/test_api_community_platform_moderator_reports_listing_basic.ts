import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_moderator_reports_listing_basic(
  connection: api.IConnection,
): Promise<void> {
  // Moderator account creation and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Note: ICommunityPlatformModerator.IJoin is {} according to DTO, so we send empty object
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    { body: {} },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // Retrieve reports list with empty filter body (minimal filters)
  const reportsPage =
    await api.functional.communityPlatform.moderator.community.reports.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(reportsPage);
  // Validate pagination metadata
  const pagination = reportsPage.pagination;
  typia.assert(pagination);
  TestValidator.predicate(
    "pagination current is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // Validate reports data array
  const data = reportsPage.data;
  TestValidator.predicate("reports data is array", Array.isArray(data));
  // For each report summary in the data, assert type and non-null
  for (const report of data) {
    typia.assert(report);
  }
  // Validate authorization enforcement by trying to call without auth
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("authorization required", 401, async () => {
    await api.functional.communityPlatform.moderator.community.reports.index(
      unauthConnection,
      { body: {} },
    );
  });
}
