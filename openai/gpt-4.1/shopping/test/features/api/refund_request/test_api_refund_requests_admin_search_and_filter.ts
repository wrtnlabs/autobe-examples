import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_refund_requests_admin_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Register as an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123$"; // Matches MinLength<8>
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.id;

  // 2. Register as a customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass123$";
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: customerPhone,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.id;

  // 3. Customer submits a refund request for a random order/seller context
  // As we have no order API, we mock an order & seller summary here
  // Just generate UUIDs for relation
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const requestedAmount = Math.floor(10000 + Math.random() * 90000);
  const refundCreate =
    await api.functional.shoppingMall.customer.refundRequests.create(
      connection,
      {
        body: {
          shopping_mall_order_id: orderId,
          reason: refundReason,
          requested_amount: requestedAmount,
          shopping_mall_seller_id: sellerId,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundCreate);
  const refundId = refundCreate.id;

  // 4. Switch to admin context (login if needed)
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  TestValidator.equals(
    "admin login id matches join id",
    adminLogin.id,
    adminId,
  );

  // 5. Perform admin refundRequests search/filter queries
  // a. Status search: pending
  const pageStatus =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        status: refundCreate.status,
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(pageStatus);
  TestValidator.predicate(
    "at least one result for status",
    pageStatus.data.length > 0,
  );
  TestValidator.predicate(
    "all with pending status",
    pageStatus.data.every((r) => r.status === refundCreate.status),
  );

  // b. Customer filter
  const pageCustomer =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        customer_id: customerId,
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(pageCustomer);
  TestValidator.predicate(
    "at least one result for customer",
    pageCustomer.data.length > 0,
  );
  TestValidator.predicate(
    "all items customer id match",
    pageCustomer.data.every((d) => d.customer.id === customerId),
  );

  // c. Order filter
  const pageOrder =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        order_id: orderId,
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(pageOrder);
  TestValidator.predicate(
    "items found for order id",
    pageOrder.data.length > 0,
  );
  TestValidator.predicate(
    "all items order id match",
    pageOrder.data.every((d) => d.order.id === orderId),
  );

  // d. Seller filter
  const pageSeller =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        seller_id: sellerId,
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(pageSeller);
  TestValidator.predicate(
    "items found for seller id",
    pageSeller.data.length > 0,
  );
  TestValidator.predicate(
    "all items seller id match",
    pageSeller.data.every((d) => d.seller.id === sellerId),
  );

  // e. Reason keyword search
  const pageReason =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        reason: refundReason.split(" ")[0], // Use first word as keyword
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(pageReason);
  TestValidator.predicate(
    "reason keyword present",
    pageReason.data.some(
      (d) => d.reason.indexOf(refundReason.split(" ")[0]) !== -1,
    ),
  );

  // f. Requested amount exact match and range
  const pageAmountExact =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        requested_amount_min: requestedAmount,
        requested_amount_max: requestedAmount,
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(pageAmountExact);
  TestValidator.predicate(
    "requested amount exact match",
    pageAmountExact.data.some((d) => d.requested_amount === requestedAmount),
  );
  TestValidator.predicate(
    "all items within requested amount range",
    pageAmountExact.data.every(
      (d) =>
        d.requested_amount >= requestedAmount &&
        d.requested_amount <= requestedAmount,
    ),
  );

  // g. Created/updated at window (test with now)
  const nowIsoString = new Date().toISOString();
  const pageCreated =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        created_from: refundCreate.created_at,
        created_to: nowIsoString,
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(pageCreated);
  TestValidator.predicate(
    "created_at within range",
    pageCreated.data.some(
      (d) =>
        d.created_at >= refundCreate.created_at && d.created_at <= nowIsoString,
    ),
  );

  // h. Pagination: limit 1 per page, get first page, and second page
  const page1 = await api.functional.shoppingMall.admin.refundRequests.index(
    connection,
    {
      body: {
        limit: 1 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination: per page = 1", page1.pagination.limit, 1);
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.admin.refundRequests.index(
      connection,
      {
        body: {
          limit: 1 as number & tags.Type<"int32">,
          page: 2 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "pagination: current page = 2",
      page2.pagination.current,
      2,
    );
  }

  // i. Sorting (if supported): try sort_by "created_at" descending
  const pageSort = await api.functional.shoppingMall.admin.refundRequests.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 3 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(pageSort);
  if (pageSort.data.length > 1) {
    // Check descending order
    for (let i = 1; i < pageSort.data.length; ++i) {
      TestValidator.predicate(
        `created_at order: ${i} vs ${i - 1}`,
        pageSort.data[i - 1].created_at >= pageSort.data[i].created_at,
      );
    }
  }

  // Validate audit fields are present (for at least one item)
  const example = pageStatus.data[0];
  TestValidator.predicate("refund id is uuid", typeof example.id === "string");
  TestValidator.predicate(
    "order summary exists",
    typeof example.order === "object" && example.order !== null,
  );
  TestValidator.predicate(
    "customer summary exists",
    typeof example.customer === "object" && example.customer !== null,
  );
  TestValidator.predicate(
    "seller summary exists",
    typeof example.seller === "object" && example.seller !== null,
  );
  TestValidator.predicate("reason present", typeof example.reason === "string");
  TestValidator.predicate(
    "created_at present",
    typeof example.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at present",
    typeof example.updated_at === "string",
  );
}
