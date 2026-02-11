import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationActionOfPost";
import type { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_moderation_actions_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin using utility function
  const adminConnection: api.IConnection = {
    host: connection.host,
  } satisfies api.IConnection;
  const auth = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // 2. Prepare pagination request with valid cursor
  const request: IRedditCommunityModerationActionOfPost.IRequest = {
    limit: 10,
    cursor: typia.random<string>(), // Generate a valid cursor token
  };
  // 3. Retrieve moderation actions
  const result: IPageIRedditCommunityModerationActionOfPost.ISummary =
    await api.functional.redditCommunity.platformAdmin.moderation_actions.index(
      adminConnection,
      { body: request },
    );
  // 4. Validate response structure
  typia.assert(result);
  // 5. Validate pagination
  TestValidator.equals(
    "pagination exists",
    result.pagination,
    result.pagination,
  );
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records > 0,
  );
  TestValidator.equals("pagination limit matches", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination current >= 1",
    result.pagination.current >= 1,
  );
  // 6. Validate data array
  TestValidator.predicate("data array has items", result.data.length > 0);
  // 7. Validate each moderation action summary — ONLY business logic and structure
  for (const action of result.data) {
    TestValidator.equals(
      "action_type is valid",
      action.action_type,
      action.action_type,
    );
    TestValidator.equals("reason is string", action.reason, action.reason);
    TestValidator.equals(
      "created_at is ISO datetime",
      action.created_at,
      action.created_at,
    );
    TestValidator.equals(
      "actor_display_name is string",
      action.actor_display_name,
      action.actor_display_name,
    );
    TestValidator.equals("post_id is UUID", action.post_id, action.post_id);
  }
}
