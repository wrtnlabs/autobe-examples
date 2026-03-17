import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin retrieval of non-existent subscription activity record.
 * 1. Admin creates account via join for authorization.
 * 2. Generate random UUID not in database.
 * 3. Call GET /communityPlatform/admin/subscription-activities/{activityId}
 * 4. Expect 404 Not Found error with proper formatting.
 */
export async function test_api_subscription_activity_nonexistent_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection and authorize via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate random UUID that does not exist in database
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent activity - expect 404
  await TestValidator.httpError(
    "non-existent subscription activity should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.subscription_activities.at(
        adminConnection,
        { activityId: nonExistentId },
      );
    },
  );
}
