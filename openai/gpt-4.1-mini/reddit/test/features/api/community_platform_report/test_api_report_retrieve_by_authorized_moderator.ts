import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_report_retrieve_by_authorized_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as moderator via join endpoint to obtain authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorAuthorized);
  // 2. Set Authorization header from token; assume utility does not set headers automatically
  moderatorConnection.headers = {
    ...(moderatorConnection.headers ?? {}),
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 3. For test reliability, retrieve an existing reportId or simulate a valid one
  // Since ICommunityPlatformReport schema is empty, simulate a valid UUID
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the report by reportId using moderatorConnection
  const report = await api.functional.communityPlatform.reports.at(
    moderatorConnection,
    {
      reportId,
    },
  );
  typia.assert(report);
  // 5. Confirm report is an object (schema empty, rely on typia.assert)
  // 6. We cannot check cache headers here as api.functional returns only data,
  //    so ensure no exception throws
}
