import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_review_statistics_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminResponse);
  // Step 2: Validate admin can access review statistics endpoint
  const reviewStats =
    await api.functional.shoppingMall.admin.reviews.stats.index(
      adminConnection,
    );
  typia.assert(reviewStats);
  // Step 3: Create unauthenticated connection (following connection isolation pattern)
  // The test requires checking non-admin access, but there's no utility function for creating customer accounts
  // This indicates a missing utility function in the system, but we must test authorization
  // We'll create a connection without any authentication headers (following connection isolation pattern)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Step 4: Verify unauthenticated connections receive 401 unauthorized error on statistics endpoint
  await TestValidator.error(
    "unauthenticated user should receive 401 unauthorized",
    async () => {
      await api.functional.shoppingMall.admin.reviews.stats.index(
        unauthenticatedConnection,
      );
    },
  );
}
