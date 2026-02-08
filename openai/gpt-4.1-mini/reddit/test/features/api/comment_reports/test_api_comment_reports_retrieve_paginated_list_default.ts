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

export async function test_api_comment_reports_retrieve_paginated_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // ICommunityPlatformModerator.IJoin is {} (empty object), so no body specifics
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  // Update moderatorConnection headers with token for authenticated requests
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Attempt to retrieve comment reports page with default (empty) filter
  const body: ICommunityPlatformCommentReport.IRequest = {};
  const output =
    await api.functional.communityPlatform.moderator.comment_reports.index(
      moderatorConnection,
      { body },
    );
  typia.assert(output);
  // 3. Validate output pagination structure
  TestValidator.predicate(
    "pagination current page is 1 or more",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is 0 or more",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is 0 or more",
    output.pagination.records >= 0,
  );
  // 4. Validate the data list matches the pagination limit count bounds
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    output.data.length <= output.pagination.limit,
  );
  // 5. Validate each comment report summary is valid
  output.data.forEach((report) => {
    typia.assert(report);
  });
}
