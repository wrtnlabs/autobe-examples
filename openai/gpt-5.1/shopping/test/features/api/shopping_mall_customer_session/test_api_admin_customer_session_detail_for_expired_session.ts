import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_admin_customer_session_detail_for_expired_session(
  connection: api.IConnection,
) {
  // 1. Admin joins and gets authenticated
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Locate at least one customer
  const customerPage: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert<IPageIShoppingMallCustomer.ISummary>(customerPage);

  TestValidator.predicate(
    "at least one customer should exist",
    () => customerPage.data.length > 0,
  );

  const customer: IShoppingMallCustomer.ISummary = customerPage.data[0];

  // 3. Search this customer's sessions and find an expired one
  const sessionsPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionsPage);

  TestValidator.predicate(
    "at least one session should exist",
    () => sessionsPage.data.length > 0,
  );

  const expiredSummary: IShoppingMallCustomerSession.ISummary | undefined =
    sessionsPage.data.find(
      (row) => row.expired_at !== null && row.expired_at !== undefined,
    );

  TestValidator.predicate(
    "there should be at least one expired session in test fixtures",
    () => expiredSummary !== undefined,
  );

  if (!expiredSummary) {
    throw new Error(
      "Test data requirement not met: no expired customer session found.",
    );
  }

  // 4. Call the session detail endpoint for the expired session
  const firstDetail: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.sessions.at(connection, {
      customerId: customer.id,
      sessionId: expiredSummary.id,
    });
  typia.assert<IShoppingMallCustomerSession>(firstDetail);

  // 5. Business rule validations on expired session detail
  TestValidator.equals(
    "detail customerId must match selected customer",
    firstDetail.customerId,
    customer.id,
  );
  TestValidator.equals(
    "detail session id must match summary id",
    firstDetail.id,
    expiredSummary.id,
  );

  TestValidator.equals(
    "ip must be consistent between summary and detail",
    firstDetail.ip,
    expiredSummary.ip,
  );
  TestValidator.equals(
    "href must be consistent between summary and detail",
    firstDetail.href,
    expiredSummary.href,
  );
  TestValidator.equals(
    "referrer must be consistent between summary and detail",
    firstDetail.referrer,
    expiredSummary.referrer,
  );

  // createdAt vs created_at
  TestValidator.equals(
    "createdAt must match created_at",
    firstDetail.createdAt,
    expiredSummary.created_at,
  );

  TestValidator.predicate(
    "expiredAt must be non-null for expired session",
    () => firstDetail.expiredAt !== null && firstDetail.expiredAt !== undefined,
  );

  if (firstDetail.expiredAt !== null && firstDetail.expiredAt !== undefined) {
    const createdAtDate = new Date(firstDetail.createdAt);
    const expiredAtDate = new Date(firstDetail.expiredAt);

    TestValidator.predicate(
      "expiredAt must be equal or later than createdAt",
      () => expiredAtDate.getTime() >= createdAtDate.getTime(),
    );

    if (
      firstDetail.lastSeenAt !== null &&
      firstDetail.lastSeenAt !== undefined
    ) {
      const lastSeenDate = new Date(firstDetail.lastSeenAt);
      TestValidator.predicate(
        "lastSeenAt must be less than or equal to expiredAt",
        () => lastSeenDate.getTime() <= expiredAtDate.getTime(),
      );
    }
  }

  // status should indicate non-active state (at least not strictly "active")
  TestValidator.predicate(
    "status of expired session must not be 'active'",
    () => firstDetail.status.toLowerCase() !== "active",
  );

  // 6. Read-only guarantee via repeated GET
  const secondDetail: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.sessions.at(connection, {
      customerId: customer.id,
      sessionId: expiredSummary.id,
    });
  typia.assert<IShoppingMallCustomerSession>(secondDetail);

  TestValidator.equals(
    "session detail must be stable across repeated reads",
    firstDetail,
    secondDetail,
  );
}
