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

export async function test_api_comment_reports_filter_by_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody: ICommunityPlatformModerator.IJoin = {};
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(authorizedModerator);
  moderatorConnection.headers = {
    Authorization: authorizedModerator.token.access,
  };
  // 2. Request comment reports without specific filter because no properties are defined
  const filterBody: ICommunityPlatformCommentReport.IRequest = {};
  const output =
    await api.functional.communityPlatform.moderator.comment_reports.index(
      moderatorConnection,
      { body: filterBody },
    );
  typia.assert(output);
  // 3. Validate pagination consistency
  TestValidator.predicate(
    "current page is positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages consistent with records and limit",
    output.pagination.pages ===
      (output.pagination.limit === 0
        ? 0
        : Math.ceil(output.pagination.records / output.pagination.limit)),
  );
}
