import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_report_listing_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // 2. Attempt to list post reports with filters that match no reports
  const filter: ICommunityPlatformPostReport.IRequest = {};
  const output = await api.functional.communityPlatform.user.post_reports.index(
    userConnection,
    {
      body: filter,
    },
  );
  typia.assert(output);
  // 3. Validate response for empty data and correct pagination info
  TestValidator.equals("data length is zero", output.data.length, 0);
  TestValidator.predicate(
    "pagination current page is positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is zero",
    output.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages is zero",
    output.pagination.pages === 0,
  );
}
