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

/**
 * Test the community reports listing endpoint for a moderator with empty filters.
 * Verify that pagination and response structure are valid, authorization is intact,
 * and that the API responds correctly with empty filter input.
 */
export async function test_api_community_platform_moderator_reports_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {}, // ICommunityPlatformModerator.IJoin has no properties
    });
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 2. Filter body must be empty due to no properties in ICommunityPlatformReport.IRequest
  const body: ICommunityPlatformReport.IRequest = {};
  // 3. Request the report index with empty filters
  const output: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.community.reports.index(
      moderatorConnection,
      { body },
    );
  typia.assert(output);
  // 4. Validate pagination properties
  TestValidator.predicate(
    "pagination current page positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  // 5. Validate that data is an array and each item is valid
  TestValidator.predicate("reports data is array", Array.isArray(output.data));
  output.data.forEach((report) => {
    typia.assert(report);
  });
}
