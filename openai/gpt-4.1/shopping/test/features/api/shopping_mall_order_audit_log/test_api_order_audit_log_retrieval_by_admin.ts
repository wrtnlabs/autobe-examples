import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAuditLog";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAuditLog";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that administrator users can search and retrieve paginated order
 * audit logs, while enforcing access controls as per business rules.
 *
 * Steps:
 *
 * 1. Register and log in as both customer and admin accounts, capturing tokens.
 * 2. As customer, create a valid order (which should generate at least one audit
 *    log event).
 * 3. Switch to admin account.
 * 4. As admin, call the order audit log search endpoint for the created
 *    order_number, providing pagination and sort options.
 * 5. Assert the audit log response is not empty, contains expected event fields,
 *    and pagination works.
 * 6. Switch to customer authentication and verify audit log endpoint access is
 *    denied for customer users.
 * 7. Attempt unauthenticated access and assert audit log endpoint access is denied
 *    as well.
 */
export async function test_api_order_audit_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and log in a random customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: customerName,
      phone: customerPhone,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Register and log in a random admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. (Re)authenticate as customer if necessary (in practice token is set above)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer-client-testing/", // using plausible values
      referrer: "https://testing-referrer/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Create a dummy address and seller summary for order creation (using randomized UUIDs/fields)
  const dummyAddress: IShoppingMallAddress.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    full_name: customerName,
    street: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 10,
      wordMax: 24,
    }),
    city: RandomGenerator.name(1),
    province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(7),
    country: "South Korea",
    phone: customerPhone,
    is_default: true,
  };
  const dummySeller: IShoppingMallSeller.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 14,
    }),
  };
  // 4. Create a customer-side order
  const orderNumber = `ORD${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000000> & tags.Maximum<99999999>>()}`;
  const orderStatus = "pending";
  const orderTotal = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<9999999>
  >() satisfies number as number;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        order_number: orderNumber,
        shopping_mall_customer_id: customer.id,
        shopping_mall_address_id: dummyAddress.id,
        shopping_mall_seller_id: dummySeller.id,
        status: orderStatus,
        total_amount: orderTotal,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.equals(
    "created order_number matches",
    order.order_number,
    orderNumber,
  );

  // 5. Switch session to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 6. As admin, request order audit log (test pagination/query options)
  const auditRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "created_at",
    order_by: "desc",
    action_type: undefined,
    from_created_at: undefined,
    to_created_at: undefined,
    actor_admin_id: undefined,
    actor_seller_id: undefined,
    actor_customer_id: undefined,
  } satisfies IShoppingMallOrderAuditLog.IRequest;
  const auditResult =
    await api.functional.shoppingMall.admin.orders.auditLogs.index(connection, {
      orderNumber: orderNumber,
      body: auditRequest,
    });
  typia.assert(auditResult);

  // 7. Assert result is paginated, has >= 1 log, basic field checks
  TestValidator.predicate(
    "audit log result has at least one event",
    auditResult.data.length >= 1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    auditResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    auditResult.pagination.limit,
    10,
  );

  for (const log of auditResult.data) {
    typia.assert(log);
    TestValidator.equals(
      "order_number in audit log matches",
      log.order.order_number,
      orderNumber,
    );
    TestValidator.predicate(
      "action_type is non-empty",
      typeof log.action_type === "string" && log.action_type.length > 0,
    );
    TestValidator.predicate(
      "created_at is non-empty",
      typeof log.created_at === "string" && log.created_at.length > 0,
    );
    // Only one of actor_admin/actor_seller/actor_customer is non-null/undefined
    TestValidator.predicate(
      "at least one actor is present",
      Boolean(log.actor_admin) ||
        Boolean(log.actor_seller) ||
        Boolean(log.actor_customer),
    );
    // All present actors have expected fields
    if (log.actor_admin) {
      typia.assert(log.actor_admin);
      TestValidator.predicate(
        "actor_admin name non-empty",
        typeof log.actor_admin.name === "string" &&
          log.actor_admin.name.length > 0,
      );
      TestValidator.predicate(
        "actor_admin email format valid",
        log.actor_admin.email.includes("@"),
      );
    }
    if (log.actor_seller) {
      typia.assert(log.actor_seller);
      TestValidator.predicate(
        "actor_seller business_name non-empty",
        typeof log.actor_seller.business_name === "string" &&
          log.actor_seller.business_name.length > 0,
      );
    }
    if (log.actor_customer) {
      typia.assert(log.actor_customer);
      TestValidator.predicate(
        "actor_customer name non-empty",
        typeof log.actor_customer.name === "string" &&
          log.actor_customer.name.length > 0,
      );
    }
  }

  // 8. Switch session back to customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer-client-testing/",
      referrer: "https://testing-referrer/",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // As customer, attempt to access admin audit log endpoint
  await TestValidator.error(
    "customer users cannot access admin audit logs",
    async () => {
      await api.functional.shoppingMall.admin.orders.auditLogs.index(
        connection,
        {
          orderNumber: orderNumber,
          body: auditRequest,
        },
      );
    },
  );

  // 9. As unauthenticated, create a new session
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to admin audit logs is forbidden",
    async () => {
      await api.functional.shoppingMall.admin.orders.auditLogs.index(
        unauthConn,
        {
          orderNumber: orderNumber,
          body: auditRequest,
        },
      );
    },
  );
}
