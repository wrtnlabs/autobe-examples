import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_moderation_logs_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a moderator using join utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityPlatformModerator.IJoin,
  });
  // Set authorization header with returned token
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // Prepare empty filter criteria as scenario does not specify fields
  const filterCriteria: ICommunityPlatformModerationLog.IRequest = {};
  // Call the patch API to retrieve moderation logs with the filter
  const response =
    await api.functional.communityPlatform.moderator.moderation_logs.patch(
      moderatorConnection,
      { body: filterCriteria },
    );
  // Assert the entire response structure
  typia.assert(response);
  // Validate pagination fields
  const pagination = response.pagination;
  TestValidator.predicate("pagination current >= 1", pagination.current >= 1);
  TestValidator.predicate("pagination limit >= 1", pagination.limit >= 1);
  TestValidator.predicate(
    "pagination records >= data length",
    pagination.records >= response.data.length,
  );
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // Validate each log summary is a valid structure but do not access fields that do not exist
  for (const log of response.data) {
    typia.assert(log); // Complete validation of the log entry
  }
}
