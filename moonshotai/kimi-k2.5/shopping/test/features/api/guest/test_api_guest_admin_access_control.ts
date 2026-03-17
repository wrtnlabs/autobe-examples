import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_guest_admin_access_control(
  connection: api.IConnection,
) {
  // Test 1: Unauthenticated access should return 401
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access should return 401",
    401,
    async () => {
      await api.functional.ecommerceMall.admin.guests.index(
        unauthenticatedConnection,
        {
          body: {} satisfies IEcommerceMallGuest.IRequest,
        },
      );
    },
  );
  // Test 2: Customer should not be able to access admin endpoint - should return 403
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await TestValidator.httpError(
    "customer access should return 403",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.guests.index(
        customerConnection,
        {
          body: {} satisfies IEcommerceMallGuest.IRequest,
        },
      );
    },
  );
  // Test 3: Seller should not be able to access admin endpoint - should return 403
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await TestValidator.httpError(
    "seller access should return 403",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.guests.index(sellerConnection, {
        body: {} satisfies IEcommerceMallGuest.IRequest,
      });
    },
  );
  // Test 4: Admin should be able to access guest listing - should return 200
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const response = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(response);
}
