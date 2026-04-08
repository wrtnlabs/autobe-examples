import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPendingRequestsCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPendingRequestsCount";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_pending_requests_count_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for authentication isolation
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller - creates seller account and sets Authorization header
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(authorizedSeller);
  // Retrieve pending requests count for seller dashboard
  const pendingCount =
    await api.functional.ecommerceMall.seller.pending_requests_count.pendingRequestsCount(
      sellerConnection,
    );
  typia.assert(pendingCount);
  // Validate count is non-negative (validated by typia but business logic check)
  TestValidator.predicate("count is non-negative", pendingCount.count >= 0);
}
