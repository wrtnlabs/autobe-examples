import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationReport";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_reports_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 2. Test default pagination retrieval
  const defaultResponse =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate pagination structure
  TestValidator.equals("pagination exists", defaultResponse.pagination, {
    current: 1,
    limit: 20,
    records: 0,
    pages: 0,
  } satisfies IPage.IPagination);
  // Validate data array structure (empty initially)
  TestValidator.equals("initial data empty", defaultResponse.data, []);
  // 3. Test with status filter
  const pendingResponse =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "pending",
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // 4. Test with content type filter
  const postTypeResponse =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
          content_type: "post",
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(postTypeResponse);
  // 5. Test with time range filter
  const timeRangeResponse =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_from: new Date().toISOString(),
          created_at_to: new Date().toISOString(),
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(timeRangeResponse);
  // 6. Test with search query
  const searchResponse =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: RandomGenerator.name(),
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 7. Test pagination boundaries
  const firstPageResponse =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.predicate(
    "valid first page",
    firstPageResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "valid page limit",
    firstPageResponse.pagination.limit === 10,
  );
  const secondPageResponse =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page number",
    secondPageResponse.pagination.current,
    2,
  );
  // 8. Test max limit boundary
  const maxLimitResponse =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit respected",
    maxLimitResponse.pagination.limit,
    100,
  );
}
