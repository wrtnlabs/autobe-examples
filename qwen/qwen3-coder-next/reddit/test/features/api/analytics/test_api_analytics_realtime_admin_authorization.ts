import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_analytics_realtime_admin_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  // 2. Authenticate member to get JWT token
  await authorize_member_login(memberConnection, {
    body: memberCredentials,
  });
  // 3. Call analytics endpoint with member token - should return 403 Forbidden
  await TestValidator.error(
    "member cannot access admin analytics",
    async () => {
      await api.functional.redditPlatform.admin.analytics.realtime(
        memberConnection,
      );
    },
  );
  // 4. Test with expired admin token scenario - create a fresh admin token then test
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "adminpassword123",
    username: RandomGenerator.name(),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  await authorize_admin_login(adminConnection, {
    body: adminCredentials,
  });
  // Verify admin can access analytics
  const analytics =
    await api.functional.redditPlatform.admin.analytics.realtime(
      adminConnection,
    );
  typia.assert(analytics);
  // 5. Test without authentication token - should return 401 Unauthorized
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user cannot access admin analytics",
    async () => {
      await api.functional.redditPlatform.admin.analytics.realtime(
        unauthenticatedConnection,
      );
    },
  );
}
