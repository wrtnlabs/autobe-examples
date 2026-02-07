import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformKarmaHistory";
import type { IRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaHistory";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_karma_history_audit(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies IRedditPlatformModerator.IJoin,
  });
  // Get karma history through moderator endpoint
  const result =
    await api.functional.redditPlatform.moderator.karma_histories.index(
      moderatorConnection,
      {
        body: {} satisfies IRedditPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(result);
  // Validate response structure
  typia.assert(result.data);
  typia.assert(result.pagination);
  // Verify pagination structure
  TestValidator.equals(
    "pagination has correct fields",
    result.pagination,
    result.pagination,
  );
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
  TestValidator.predicate(
    "pagination has current page",
    result.pagination.current >= 0,
  );
  TestValidator.predicate("pagination has limit", result.pagination.limit >= 0);
  // Verify karma history data structure
  for (const history of result.data) {
    typia.assert(history);
  }
}
