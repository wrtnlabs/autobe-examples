import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_duplicate_pending(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstReason = `Administrator request ${RandomGenerator.paragraph({
    sentences: 2,
  })}`;
  const firstRequest =
    await api.functional.shoppingMall.customer.administrator_requests.create(
      customerConnection,
      {
        body: {
          reason: firstReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals("first request status", firstRequest.status, "pending");
  TestValidator.equals(
    "first request reason",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first request rejected reason",
    firstRequest.rejectedReason,
    null,
  );
  TestValidator.equals(
    "first request deleted at",
    firstRequest.deletedAt,
    null,
  );
  await TestValidator.error(
    "duplicate pending administrator request",
    async () => {
      await api.functional.shoppingMall.customer.administrator_requests.create(
        customerConnection,
        {
          body: {
            reason: `Duplicate ${RandomGenerator.paragraph({ sentences: 3 })}`,
          } satisfies IShoppingMallAdministratorRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "first request still pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request reason remains unchanged",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first request still has no rejection reason",
    firstRequest.rejectedReason,
    null,
  );
  TestValidator.equals(
    "first request still active",
    firstRequest.deletedAt,
    null,
  );
}
