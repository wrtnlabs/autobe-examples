import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_governance_queue_denied_to_member_roles(
  connection: api.IConnection,
): Promise<void> {
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinedCustomer);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInCustomer = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: customerHref,
        referrer: customerReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(loggedInCustomer);
  TestValidator.equals(
    "customer email preserved after login",
    loggedInCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer id preserved after login",
    loggedInCustomer.id,
    joinedCustomer.id,
  );
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinedSeller);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loggedInSeller);
  TestValidator.equals(
    "seller email preserved after login",
    loggedInSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller id preserved after login",
    loggedInSeller.id,
    joinedSeller.id,
  );
  TestValidator.equals(
    "seller approval status unchanged after login",
    loggedInSeller.approval_status,
    joinedSeller.approval_status,
  );
  const customerRequestReason = RandomGenerator.paragraph({ sentences: 3 });
  const customerAdministratorRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerLoginConnection,
      {
        body: {
          reason: customerRequestReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(customerAdministratorRequest);
  TestValidator.equals(
    "customer administrator request reason stored",
    customerAdministratorRequest.reason,
    customerRequestReason,
  );
  TestValidator.equals(
    "customer administrator request pending",
    customerAdministratorRequest.status,
    "pending",
  );
  TestValidator.equals(
    "customer administrator request applicant type",
    customerAdministratorRequest.applicant_type,
    "customer",
  );
  TestValidator.equals(
    "customer administrator request review note empty",
    customerAdministratorRequest.review_note,
    null,
  );
  TestValidator.equals(
    "customer administrator request rejection reason empty",
    customerAdministratorRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "customer administrator request not reviewed yet",
    customerAdministratorRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "customer administrator request not approved yet",
    customerAdministratorRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "customer administrator request not rejected yet",
    customerAdministratorRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "customer administrator request reviewer absent",
    customerAdministratorRequest.reviewedByAdministrator,
    null,
  );
  const sellerRequestReason = RandomGenerator.paragraph({ sentences: 3 });
  const sellerAdministratorRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      sellerLoginConnection,
      {
        body: {
          reason: sellerRequestReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(sellerAdministratorRequest);
  TestValidator.equals(
    "seller administrator request reason stored",
    sellerAdministratorRequest.reason,
    sellerRequestReason,
  );
  TestValidator.equals(
    "seller administrator request pending",
    sellerAdministratorRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller administrator request applicant type",
    sellerAdministratorRequest.applicant_type,
    "seller",
  );
  TestValidator.equals(
    "seller administrator request review note empty",
    sellerAdministratorRequest.review_note,
    null,
  );
  TestValidator.equals(
    "seller administrator request rejection reason empty",
    sellerAdministratorRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller administrator request not reviewed yet",
    sellerAdministratorRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "seller administrator request not approved yet",
    sellerAdministratorRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "seller administrator request not rejected yet",
    sellerAdministratorRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "seller administrator request reviewer absent",
    sellerAdministratorRequest.reviewedByAdministrator,
    null,
  );
  const deniedQueueRequest = {
    status: "pending",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdministratorRequest.IRequest;
  await TestValidator.httpError(
    "customer cannot read governance administrator request queue",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.administrator_requests.index(
        customerLoginConnection,
        {
          body: deniedQueueRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "seller cannot read governance administrator request queue",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.administrator_requests.index(
        sellerLoginConnection,
        {
          body: deniedQueueRequest,
        },
      );
    },
  );
  TestValidator.equals(
    "customer request remains pending after denied governance queue access",
    customerAdministratorRequest.status,
    "pending",
  );
  TestValidator.equals(
    "customer request remains unreviewed after denied governance queue access",
    customerAdministratorRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "customer request remains without approval after denied governance queue access",
    customerAdministratorRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "customer request remains without rejection after denied governance queue access",
    customerAdministratorRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "customer remains non administrator because no governance review occurred",
    customerAdministratorRequest.reviewedByAdministrator,
    null,
  );
  TestValidator.equals(
    "seller request remains pending after denied governance queue access",
    sellerAdministratorRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller request remains unreviewed after denied governance queue access",
    sellerAdministratorRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "seller request remains without approval after denied governance queue access",
    sellerAdministratorRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "seller request remains without rejection after denied governance queue access",
    sellerAdministratorRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "seller request remains without reviewer after denied governance queue access",
    sellerAdministratorRequest.reviewedByAdministrator,
    null,
  );
  TestValidator.equals(
    "seller approval status still unchanged after denied governance queue access",
    loggedInSeller.approval_status,
    joinedSeller.approval_status,
  );
}
