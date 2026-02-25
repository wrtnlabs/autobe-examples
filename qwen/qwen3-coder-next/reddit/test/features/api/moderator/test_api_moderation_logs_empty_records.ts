import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_logs_empty_records(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
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
  // Update connection with fresh token from registration
  const freshConnection: api.IConnection = { host: connection.host };
  // Use the stored password from the original request instead of moderator.password
  const password = RandomGenerator.alphaNumeric(16);
  await api.functional.redditClone.auth.moderator.join(freshConnection, {
    body: {
      email: moderator.email,
      password: password,
      username: moderator.username,
    } satisfies IRedditCloneModerator.IJoin,
  });
  // Test: Retrieve moderation logs for moderator with no recorded actions
  const logs = await api.functional.redditClone.moderators.logs.index(
    freshConnection,
    {
      moderatorId: moderator.id,
    },
  );
  typia.assert(logs);
  // Validate empty logs response
  TestValidator.equals(
    "pagination records is zero",
    logs.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is zero", logs.pagination.pages, 0);
  TestValidator.equals("pagination current is one", logs.pagination.current, 1);
  TestValidator.equals(
    "pagination limit is default",
    logs.pagination.limit,
    20,
  );
  TestValidator.equals("data is empty array", logs.data, []);
}