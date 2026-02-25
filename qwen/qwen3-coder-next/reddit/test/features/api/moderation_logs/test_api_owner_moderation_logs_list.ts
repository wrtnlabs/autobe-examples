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

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_moderation_logs_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // 2. Test moderation logs listing - this is the core functionality
  const logs =
    await api.functional.redditClone.owner.communities.moderation_logs.list(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(logs);
  // 3. Validate response structure matches DTO definition
  TestValidator.equals(
    "response has correct structure",
    true,
    logs.pagination !== undefined && logs.data !== undefined,
  );
  TestValidator.equals(
    "pagination has correct fields",
    true,
    logs.pagination.current !== undefined &&
      logs.pagination.limit !== undefined &&
      logs.pagination.records !== undefined &&
      logs.pagination.pages !== undefined,
  );
  TestValidator.predicate(
    "data is array of moderation logs",
    Array.isArray(logs.data),
  );
}
