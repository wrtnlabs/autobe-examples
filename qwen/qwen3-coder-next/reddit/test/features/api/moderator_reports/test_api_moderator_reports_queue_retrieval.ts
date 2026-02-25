import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_reports_queue_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditClone.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // Execute: Get moderator reports queue
  const result: IPageIRedditCloneContentReport.ISummary =
    await api.functional.redditClone.moderator.reports.queue.index(
      moderatorConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(result);
  // Validate: Check that the report queue is empty (no pending reports)
  TestValidator.equals("no pending reports in queue", result.data.length, 0);
  TestValidator.equals("pagination records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", result.pagination.pages, 0);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10 (default)",
    result.pagination.limit,
    10,
  );
}
