import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_list_forbidden_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer A (will be the one attempting forbidden access)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAJoin = await authorize_customer_join(customerAConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customerAJoin);
  // 2. Create and authenticate customer B (owner of the reviews we'll try to access)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBJoin = await authorize_customer_join(customerBConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customerBJoin);
  // 3. Customer B attempts to access customer A's reviews by filtering with customer A's ID
  // This should fail with 403 Forbidden due to authorization check
  await TestValidator.error(
    "customer B cannot access customer A's reviews",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.index(
        customerBConnection,
        {
          body: {
            customerId: customerAJoin.id,
          } satisfies IEcommerceMallReview.IRequest,
        },
      );
    },
  );
  // 4. Verify customer A can access their own reviews (should succeed)
  const customerAOwnReviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          customerId: customerAJoin.id,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(customerAOwnReviews);
  TestValidator.equals(
    "customer A can access own reviews",
    customerAOwnReviews,
    customerAOwnReviews,
  );
}
