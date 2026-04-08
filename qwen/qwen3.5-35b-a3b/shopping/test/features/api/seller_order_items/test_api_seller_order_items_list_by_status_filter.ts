import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_items_list_by_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account (approval_status = 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approval_status,
    "pending",
  );
  // 2. Register member (customer) account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  // 3. Login seller (to get authenticated connection for order items listing)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword, // Use actual password, not token
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 4. Test status filtering for order items
  // Since we don't have order creation endpoints available, we test the filter validation
  // The endpoint should accept valid status filters and return filtered results
  // 4.1. Test with status='paid' filter
  const paidFilterResponse =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerLoginConnection,
      {
        body: {
          status: "paid",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(paidFilterResponse);
  TestValidator.equals(
    "pagination records for paid filter",
    paidFilterResponse.pagination.records,
    paidFilterResponse.data.length,
  );
  // 4.2. Test with status='shipped' filter
  const shippedFilterResponse =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerLoginConnection,
      {
        body: {
          status: "shipped",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedFilterResponse);
  TestValidator.equals(
    "pagination records for shipped filter",
    shippedFilterResponse.pagination.records,
    shippedFilterResponse.data.length,
  );
  // 4.3. Test with status='delivered' filter
  const deliveredFilterResponse =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerLoginConnection,
      {
        body: {
          status: "delivered",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredFilterResponse);
  TestValidator.equals(
    "pagination records for delivered filter",
    deliveredFilterResponse.pagination.records,
    deliveredFilterResponse.data.length,
  );
  // 4.4. Test with no status filter (should return all items)
  const noFilterResponse =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerLoginConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  TestValidator.equals(
    "pagination records without filter",
    noFilterResponse.pagination.records,
    noFilterResponse.data.length,
  );
  // 4.5. Verify all order items in filtered responses have correct status
  for (const item of paidFilterResponse.data) {
    typia.assert(item);
    TestValidator.equals("paid filter item status", item.status, "paid");
  }
  for (const item of shippedFilterResponse.data) {
    typia.assert(item);
    TestValidator.equals("shipped filter item status", item.status, "shipped");
  }
  for (const item of deliveredFilterResponse.data) {
    typia.assert(item);
    TestValidator.equals(
      "delivered filter item status",
      item.status,
      "delivered",
    );
  }
}
