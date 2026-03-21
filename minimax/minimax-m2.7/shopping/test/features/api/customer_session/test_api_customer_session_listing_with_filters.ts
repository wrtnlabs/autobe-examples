import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
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
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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

export async function test_api_customer_session_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer to obtain JWT tokens for session listing
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.100",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Query sessions with multiple filters applied
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const sessionsResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          actorType: "customer",
          status: "active",
          createdAfter: oneHourAgo.toISOString() satisfies string &
            tags.Format<"date-time">,
          createdBefore: oneHourLater.toISOString() satisfies string &
            tags.Format<"date-time">,
          ip: "192.168.1",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination exists",
    sessionsResponse.pagination !== null &&
      sessionsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    sessionsResponse.pagination.current !== null &&
      sessionsResponse.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    sessionsResponse.pagination.limit !== null &&
      sessionsResponse.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    sessionsResponse.pagination.records !== null &&
      sessionsResponse.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has total pages",
    sessionsResponse.pagination.pages !== null &&
      sessionsResponse.pagination.pages !== undefined,
    true,
  );
  // 4. Validate sessions exist
  TestValidator.predicate(
    "sessions list exists",
    sessionsResponse.data !== null && sessionsResponse.data !== undefined,
  );
  // 5. Validate each session has required fields
  for (const session of sessionsResponse.data) {
    TestValidator.equals(
      "session has id",
      session.id !== null && session.id !== undefined,
      true,
    );
    TestValidator.equals(
      "session has ip",
      session.ip !== null && session.ip !== undefined,
      true,
    );
    TestValidator.equals(
      "session has href",
      session.href !== null && session.href !== undefined,
      true,
    );
    TestValidator.equals(
      "session has referrer",
      session.referrer !== null && session.referrer !== undefined,
      true,
    );
    TestValidator.equals(
      "session has created_at",
      session.created_at !== null && session.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has updated_at",
      session.updated_at !== null && session.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has expired_at",
      session.expired_at !== null && session.expired_at !== undefined,
      true,
    );
  }
  // 6. Validate sessions are ordered by created_at descending
  if (sessionsResponse.data.length > 1) {
    for (let i = 0; i < sessionsResponse.data.length - 1; i++) {
      const current = new Date(sessionsResponse.data[i].created_at);
      const next = new Date(sessionsResponse.data[i + 1].created_at);
      TestValidator.predicate(
        `session ${i} created_at >= session ${i + 1} created_at`,
        current >= next,
      );
    }
  }
  // 7. Validate filter criteria matching
  for (const session of sessionsResponse.data) {
    // IP filter should match partial (contains "192.168.1")
    TestValidator.predicate(
      "session ip contains filter pattern",
      session.ip.includes("192.168.1"),
    );
  }
}
