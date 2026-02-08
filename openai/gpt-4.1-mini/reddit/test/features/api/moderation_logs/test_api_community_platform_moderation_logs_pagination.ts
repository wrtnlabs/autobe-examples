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

export async function test_api_community_platform_moderation_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup - join to obtain authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorJoinResult);
  // Use the returned connection including updated authorization headers
  moderatorConnection.headers = moderatorJoinResult.token
    ? { Authorization: moderatorJoinResult.token.access }
    : {};
  // 2. Fetch moderation logs without pagination parameters since none are defined
  const output =
    await api.functional.communityPlatform.moderator.moderation_logs.get(
      moderatorConnection,
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  const { pagination, data } = output;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );
  // Pages calculation matches records and limit
  const calculatedPages =
    pagination.limit > 0 ? Math.ceil(pagination.records / pagination.limit) : 0;
  TestValidator.equals(
    "pagination pages match records and limit",
    pagination.pages,
    calculatedPages,
  );
  // 4. Validate data length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    data.length <= pagination.limit,
  );
  // 5. Additional checks can be added here, e.g. data consistency
}
