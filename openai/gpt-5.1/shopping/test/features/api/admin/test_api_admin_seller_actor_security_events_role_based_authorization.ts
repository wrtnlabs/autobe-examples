import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_seller_actor_security_events_role_based_authorization(
  connection: api.IConnection,
) {
  // 1. Unauthenticated access using a cloned connection with empty headers
  const anonymous: api.IConnection = {
    ...connection,
    headers: {},
  };

  const anonymousSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const unauthenticatedRequestBody = {
    page: 1,
    limit: 10,
    actor_type: "seller",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  await TestValidator.error(
    "unauthenticated seller security events search should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.actorSecurityEvents.index(
        anonymous,
        {
          sellerId: anonymousSellerId,
          body: unauthenticatedRequestBody,
        },
      );
    },
  );

  // 2. Register a seller and keep its id for later seller-specific tests
  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  const sellerScopedRequestBody = {
    page: 1,
    limit: 10,
    actor_type: "seller",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  // 3. Seller token should not be allowed to call seller-scoped admin endpoint
  await TestValidator.error(
    "seller token cannot call admin seller actor security events",
    async () => {
      await api.functional.shoppingMall.admin.sellers.actorSecurityEvents.index(
        connection,
        {
          sellerId,
          body: sellerScopedRequestBody,
        },
      );
    },
  );

  // 4. Switch to customer token via customer join
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerScopedRequestBody = {
    page: 1,
    limit: 10,
    actor_type: "seller",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  await TestValidator.error(
    "customer token cannot call admin seller actor security events",
    async () => {
      await api.functional.shoppingMall.admin.sellers.actorSecurityEvents.index(
        connection,
        {
          sellerId,
          body: customerScopedRequestBody,
        },
      );
    },
  );

  // 5. Switch to admin token via admin join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 6. As admin, create a seller-scoped actor security event
  const createEventBody = {
    actor_type: "seller",
    event_type: "LOGIN_FAILED",
    ip: null,
    user_agent: null,
    metadata: null,
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createEventBody,
      },
    );
  typia.assert<IShoppingMallActorSecurityEvent>(createdEvent);

  // 7. Admin successfully queries seller-scoped events for the seller
  const adminQueryRequestBody = {
    page: 1,
    limit: 20,
    actor_type: "seller",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const page: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.sellers.actorSecurityEvents.index(
      connection,
      {
        sellerId,
        body: adminQueryRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(page);

  TestValidator.predicate(
    "admin can see at least one seller security event in result page",
    () => page.data.some((event) => event.actor_type === "seller"),
  );
}
