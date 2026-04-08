import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_filter_by_ip_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Send PATCH request with IP pattern filter and pagination
  const sessionsResponse =
    await api.functional.ecommerceMall.customer.customer.sessions.index(
      customerConnection,
      {
        body: {
          ipPattern: "192.168.%",
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "response has pagination metadata",
    sessionsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    sessionsResponse.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    sessionsResponse.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    sessionsResponse.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has total pages",
    sessionsResponse.pagination.pages !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(sessionsResponse.data),
    true,
  );
  // 4. Validate limit matches requested value
  TestValidator.equals(
    "limit matches requested value",
    sessionsResponse.pagination.limit,
    5,
  );
  // 5. Validate that all returned sessions match the IP pattern filter
  for (const session of sessionsResponse.data) {
    TestValidator.predicate(
      "session IP matches filter pattern 192.168.%",
      session.ip.startsWith("192.168."),
    );
  }
  // 6. Validate sorting by createdAt descending
  if (sessionsResponse.data.length > 1) {
    for (let i = 0; i < sessionsResponse.data.length - 1; i++) {
      const current = new Date(sessionsResponse.data[i].created_at).getTime();
      const next = new Date(sessionsResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "sessions sorted by createdAt descending",
        current >= next,
      );
    }
  }
  // 7. Validate pagination limits
  TestValidator.predicate(
    "current page is positive",
    sessionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionsResponse.pagination.pages >= 0,
  );
}
