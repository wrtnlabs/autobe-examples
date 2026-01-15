import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReturnTrendAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReturnTrendAnalytics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_return_trends_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Admin should be able to access return trends
  const adminResponse: ICommunityPlatformReturnTrendAnalytics =
    await api.functional.communityPlatform.admin.analytics.shipments.return_trends.index(
      adminConnection,
    );
  typia.assert(adminResponse);
  TestValidator.predicate(
    "admin access returned data",
    adminResponse !== undefined,
  );
  // Create unauthenticated connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Guest should be denied access - must throw 401 HttpError
  await TestValidator.httpError(
    "unauthenticated user should be denied access",
    401,
    async () => {
      await api.functional.communityPlatform.admin.analytics.shipments.return_trends.index(
        guestConnection,
      );
    },
  );
}