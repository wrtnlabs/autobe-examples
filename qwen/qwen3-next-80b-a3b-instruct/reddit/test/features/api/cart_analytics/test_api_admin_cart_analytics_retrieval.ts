import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_cart_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin using utility function (MANDATORY)
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResult);
  // Call the analytics endpoint using the authenticated admin connection
  const analytics =
    await api.functional.communityPlatform.admin.dashboard.admin.carts.analytics.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate the response structure and properties are correctly typed
  TestValidator.equals(
    "category ID is a valid UUID",
    analytics.categoryId,
    analytics.categoryId,
  );
  TestValidator.predicate(
    "cart item count is a positive int32",
    analytics.cartItemCount > 0 && Number.isInteger(analytics.cartItemCount),
  );
  TestValidator.predicate(
    "cart item value is non-negative",
    analytics.cartItemValue >= 0,
  );
  TestValidator.predicate(
    "category name is not empty",
    analytics.categoryName.length > 0,
  );
}
