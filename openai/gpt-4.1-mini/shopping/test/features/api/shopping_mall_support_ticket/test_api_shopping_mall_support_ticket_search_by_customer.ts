import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSupportTicket";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

export async function test_api_shopping_mall_support_ticket_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer account creation and login (join)
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd123!",
    href: "https://shoppingmall.example.com/register",
    referrer: "https://shoppingmall.example.com/home",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customer);

  // 2. Basic search tickets without any filters
  const baseSearchReq = {} satisfies IShoppingMallSupportTicket.IRequest;
  const baseSearchRes: IPageIShoppingMallSupportTicket.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.index(
      connection,
      { body: baseSearchReq },
    );
  typia.assert(baseSearchRes);
  TestValidator.predicate(
    "page number in pagination should be >= 0",
    baseSearchRes.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit in pagination should be > 0",
    baseSearchRes.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count should be >= 0",
    baseSearchRes.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be >= 0",
    baseSearchRes.pagination.pages >= 0,
  );

  // 3. Search tickets with page and limit filters
  const paginationReq = {
    page: 2,
    limit: 15,
  } satisfies IShoppingMallSupportTicket.IRequest;
  const paginationRes =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.index(
      connection,
      { body: paginationReq },
    );
  typia.assert(paginationRes);
  TestValidator.equals(
    "pagination page should be 2",
    paginationRes.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit should be 15",
    paginationRes.pagination.limit,
    15,
  );

  // 4. Search tickets with status and submitter_type filters
  const statusSubmitterReq = {
    status: "open",
    submitter_type: "customer",
  } satisfies IShoppingMallSupportTicket.IRequest;
  const statusSubmitterRes =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.index(
      connection,
      { body: statusSubmitterReq },
    );
  typia.assert(statusSubmitterRes);
  for (const ticket of statusSubmitterRes.data) {
    TestValidator.equals("ticket status must be 'open'", ticket.status, "open");
  }

  // 5. Search tickets with search term filter
  const searchTerm = "payment";
  const searchTermReq = {
    search: searchTerm,
  } satisfies IShoppingMallSupportTicket.IRequest;
  const searchTermRes =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.index(
      connection,
      { body: searchTermReq },
    );
  typia.assert(searchTermRes);

  // 6. Search tickets with date range filters
  const createdFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const createdTo = new Date().toISOString();
  const updatedFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const updatedTo = new Date().toISOString();
  const dateRangeReq = {
    created_from: createdFrom,
    created_to: createdTo,
    updated_from: updatedFrom,
    updated_to: updatedTo,
  } satisfies IShoppingMallSupportTicket.IRequest;
  const dateRangeRes =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.index(
      connection,
      { body: dateRangeReq },
    );
  typia.assert(dateRangeRes);
  for (const ticket of dateRangeRes.data) {
    TestValidator.predicate(
      "ticket created_at in date range",
      ticket.created_at >= createdFrom && ticket.created_at <= createdTo,
    );
    TestValidator.predicate(
      "ticket updated_at in date range",
      ticket.updated_at >= updatedFrom && ticket.updated_at <= updatedTo,
    );
  }
}
