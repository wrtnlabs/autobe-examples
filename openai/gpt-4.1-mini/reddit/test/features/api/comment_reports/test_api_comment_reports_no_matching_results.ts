import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_comment_reports_no_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinPayload: ICommunityPlatformModerator.IJoin = {};
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinPayload,
  });
  // Add Authorization header with access token
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = authorized.token.access;
  // 2. Use empty or highly restrictive filter criteria to guarantee no match
  const filterBody: ICommunityPlatformCommentReport.IRequest = {};
  // 3. Call the comment reports index API and get paginated results
  const result =
    await api.functional.communityPlatform.moderator.comment_reports.index(
      moderatorConnection,
      { body: filterBody },
    );
  // 4. Assert the result structure and contents
  typia.assert(result);
  // 5. Validate that data array is empty
  TestValidator.equals("empty data array", result.data.length, 0);
  // 6. Validate pagination metadata: current page should be 1 or 0, records 0, pages 0
  TestValidator.equals("pagination current page", result.pagination.current, 0);
  TestValidator.equals("pagination record count", result.pagination.records, 0);
  TestValidator.equals("pagination pages count", result.pagination.pages, 0);
  // Limit should be zero or positive (depending on default)
  TestValidator.predicate(
    "pagination limit non-negative",
    result.pagination.limit >= 0,
  );
}
