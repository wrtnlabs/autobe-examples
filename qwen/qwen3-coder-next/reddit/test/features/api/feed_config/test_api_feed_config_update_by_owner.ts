import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_feed_config_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup owner authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Update feed configuration with all valid parameters
  const updatedConfig =
    await api.functional.redditClone.owner.feed_configs.updateFeedConfig(
      ownerConnection,
    );
  typia.assert(updatedConfig);
  // 3. Validate updated configuration structure
  TestValidator.equals("id exists", typeof updatedConfig.id, "string");
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f-]{36}$/i.test(updatedConfig.id),
  );
  TestValidator.equals(
    "defaultSortAlgorithm is valid",
    ["hot", "new", "top", "controversial"].includes(
      updatedConfig.defaultSortAlgorithm,
    ),
    true,
  );
  TestValidator.equals(
    "defaultTimeFilter is valid",
    ["today", "week", "month", "year", "allTime", null].includes(
      updatedConfig.defaultTimeFilter,
    ),
    true,
  );
  TestValidator.equals(
    "homeFeedRequiresAuth is boolean",
    typeof updatedConfig.homeFeedRequiresAuth,
    "boolean",
  );
  TestValidator.equals(
    "feedViewCachingEnabled is boolean",
    typeof updatedConfig.feedViewCachingEnabled,
    "boolean",
  );
  TestValidator.predicate(
    "maxPostsPerView is positive",
    updatedConfig.maxPostsPerView > 0,
  );
  TestValidator.predicate(
    "paginationOffsetStep is positive",
    updatedConfig.paginationOffsetStep > 0,
  );
}
