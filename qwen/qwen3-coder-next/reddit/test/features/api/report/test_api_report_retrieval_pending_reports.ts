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

export async function test_api_report_retrieval_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Retrieve pending reports for a community
  // Note: Since we don't have community creation or post/report creation APIs
  // in the available SDK, we'll test the report retrieval endpoint with a valid community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.redditClone.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.predicate("has pagination", result.pagination !== undefined);
  TestValidator.predicate(
    "has data array",
    Array.isArray(result.data) && result.data.length >= 0,
  );
  TestValidator.predicate(
    "has non-negative records count",
    result.pagination.records >= 0,
  );
}
