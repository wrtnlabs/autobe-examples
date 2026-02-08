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

export async function test_api_report_pending_list_as_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare moderator authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. Retrieve pending reports list with authorization
  const reports =
    await api.functional.communityPlatform.moderator.reports.pending.index(
      moderatorConnection,
    );
  typia.assert(reports);
  // 3. Validate response schema and contents
  // Pagination info
  const pagination = reports.pagination;
  TestValidator.predicate(
    "pagination current page must be >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit must be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be >= 0",
    pagination.pages >= 0,
  );
  // Reports list is an array
  TestValidator.predicate(
    "reports data is an array",
    Array.isArray(reports.data),
  );
  // Removed access to properties that do not exist on ISummary

  // 4. Test unauthorized access (no auth header)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should fail without authorization",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.reports.pending.index(
        unauthorizedConnection,
      );
    },
  );
}
