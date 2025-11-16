import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSummary";

export async function test_api_seller_performance_summary_access_forbidden_without_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator so that a valid platformAdmin
  //    authentication context exists on the primary connection.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(admin);

  // 2. Build an unauthenticated connection by cloning the existing connection
  //    but providing an empty headers object so that no Authorization token is
  //    attached. Do not modify this headers object afterwards so that header
  //    management remains under SDK control.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Prepare a plausible sellerPerformanceSummaryId (UUID format). For this
  //    negative authentication test, we do not need the ID to correspond to an
  //    existing record; the focus is solely on access control behavior.
  const sellerPerformanceSummaryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Verify that calling the platformAdmin-only endpoint with an
  //    unauthenticated connection results in an error, indicating that access
  //    is forbidden without proper admin authentication.
  await TestValidator.error(
    "seller performance summary access must fail without admin auth",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPerformanceSummaries.at(
        unauthConnection,
        {
          sellerPerformanceSummaryId,
        },
      );
    },
  );
}
