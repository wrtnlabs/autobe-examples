import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDisputeMessage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeMessage";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a customer can retrieve a paginated and filtered list of all
 * messages in a dispute they are a participant of, with advanced options.
 *
 * 1. Register and login as a customer (store credentials)
 * 2. Register and login as an admin (store credentials)
 * 3. Admin creates a dispute targeting the customer and a fake seller
 * 4. Assume the existence of messages (the system may pre-seed, or may be empty)
 * 5. As the customer, perform a message search: a. Filter by sender role = 'admin'
 *    (should be empty if no admin messages) b. Filter content_contains = ""
 *    (all messages) c. Filter a dummy/future date range (should be empty) d.
 *    Pagination: page = 1, limit = 10
 * 6. Assert all messages returned are in the dispute and fit filters
 * 7. Negative scenario: switch to an unrelated (new) customer account and assert
 *    the same search returns authorization error (access denied)
 */
export async function test_api_dispute_message_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration & login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Admin registration & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Login as admin (actor switch for admin-dispute creation)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Admin creates dispute involving customer (use dummy seller as customer is main target)
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();
  const dispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: fakeSellerId,
        status: "open",
        subject: RandomGenerator.paragraph({ sentences: 4 }),
        root_cause: RandomGenerator.paragraph({ sentences: 3 }),
        resolution_note: null,
        shopping_mall_refund_request_id: null,
        shopping_mall_admin_id: admin.id,
      } satisfies IShoppingMallDispute.ICreate,
    });
  typia.assert(dispute);

  // (Assume messages exist - system may seed test data, otherwise messages array may be empty)

  // 4. Login as customer (actor switch for access-controlled search)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer-portal/", // required by schema
      referrer: "https://customer-portal/join", // required by schema
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5a. Search: filter by sender role = 'admin'
  const pageRoleAdmin: IPageIShoppingMallDisputeMessage.ISummary =
    await api.functional.shoppingMall.customer.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          role: "admin",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallDisputeMessage.IRequest,
      },
    );
  typia.assert(pageRoleAdmin);
  TestValidator.predicate(
    "all returned messages have role 'admin'",
    pageRoleAdmin.data.every((msg) => msg.role === "admin"),
  );
  TestValidator.predicate(
    "all messages belong to the correct dispute",
    pageRoleAdmin.data.every((msg) => msg.dispute.id === dispute.id),
  );

  // 5b. Search: content_contains = "" (should just return all messages in dispute page)
  const pageContent: IPageIShoppingMallDisputeMessage.ISummary =
    await api.functional.shoppingMall.customer.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          content_contains: "",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallDisputeMessage.IRequest,
      },
    );
  typia.assert(pageContent);
  TestValidator.predicate(
    "all messages (content search blank) belong to correct dispute",
    pageContent.data.every((msg) => msg.dispute.id === dispute.id),
  );

  // 5c. Search: dummy/future date range with no data
  const pageFuture: IPageIShoppingMallDisputeMessage.ISummary =
    await api.functional.shoppingMall.customer.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          created_at_from: new Date(3000, 0, 1).toISOString(), // far future
          created_at_to: new Date(3000, 0, 2).toISOString(),
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Maximum<100>,
        } satisfies IShoppingMallDisputeMessage.IRequest,
      },
    );
  typia.assert(pageFuture);
  TestValidator.equals(
    "future date range yields empty",
    pageFuture.data.length,
    0,
  );

  // 5d. Pagination scenario
  const pageDefault: IPageIShoppingMallDisputeMessage.ISummary =
    await api.functional.shoppingMall.customer.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Maximum<100>,
        } satisfies IShoppingMallDisputeMessage.IRequest,
      },
    );
  typia.assert(pageDefault);
  TestValidator.predicate(
    "pagination page 1 returns ten or fewer messages",
    pageDefault.data.length <= 10,
  );

  // 6. Switch to an unrelated customer and try search (should fail)
  const unrelatedEmail = typia.random<string & tags.Format<"email">>();
  const unrelatedPassword = RandomGenerator.alphaNumeric(12);
  const unrelatedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: unrelatedEmail,
        password: unrelatedPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(unrelatedCustomer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: unrelatedEmail,
      password: unrelatedPassword,
      href: "https://customer-portal/", // required by schema
      referrer: "https://customer-portal/join", // required by schema
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });

  await TestValidator.error(
    "unauthorized customer cannot query messages for disputes not their own",
    async () => {
      await api.functional.shoppingMall.customer.disputes.messages.index(
        connection,
        {
          disputeId: dispute.id,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number & tags.Type<"int32"> & tags.Maximum<100>,
          } satisfies IShoppingMallDisputeMessage.IRequest,
        },
      );
    },
  );
}
