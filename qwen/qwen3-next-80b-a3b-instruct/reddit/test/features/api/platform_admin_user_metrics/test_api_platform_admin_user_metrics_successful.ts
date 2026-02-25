import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_user_metrics_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve user metrics using SDK function
  const metrics =
    await api.functional.redditCommunity.platformAdmin.users.metrics.at(
      connection,
      { userId: admin.id },
    );
  typia.assert(metrics);
  // 3. Validate metrics structure and values
  TestValidator.predicate(
    "postCount is number",
    typeof metrics.postCount === "number",
  );
  TestValidator.predicate(
    "commentCount is number",
    typeof metrics.commentCount === "number",
  );
  TestValidator.predicate("postCount >= 0", metrics.postCount >= 0);
  TestValidator.predicate("commentCount >= 0", metrics.commentCount >= 0);
}
