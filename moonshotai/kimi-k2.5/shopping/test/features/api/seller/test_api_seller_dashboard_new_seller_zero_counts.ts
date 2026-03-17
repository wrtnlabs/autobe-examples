import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_new_seller_zero_counts(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller connection with no prior activity
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register a new seller account - this creates an approved seller with zero activity
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Retrieve seller dashboard metrics
  const dashboard =
    await api.functional.ecommerceMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // Validate all counts are zero for new seller with no activity
  TestValidator.equals(
    "productCount should be 0 for new seller",
    dashboard.productCount,
    0,
  );
  TestValidator.equals(
    "orderItemCount should be 0 for new seller",
    dashboard.orderItemCount,
    0,
  );
  TestValidator.equals(
    "pendingCancellationRequestCount should be 0 for new seller",
    dashboard.pendingCancellationRequestCount,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequestCount should be 0 for new seller",
    dashboard.pendingRefundRequestCount,
    0,
  );
}
