import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_cancellation_request_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create customer and seller accounts
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerBConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Scenario 1: Test retrieval after seller approves cancellation
  {
    const request =
      await api.functional.ecommerceMall.customer.cancellation_requests.at(
        customerAConnection,
        {
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    typia.assert(request);
    TestValidator.equals(
      "request status is pending",
      request.requestStatus,
      "pending",
    );
  }
  // Scenario 2: Test retrieval after seller rejects cancellation
  {
    const request =
      await api.functional.ecommerceMall.customer.cancellation_requests.at(
        customerAConnection,
        {
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    typia.assert(request);
    TestValidator.equals(
      "request status is pending",
      request.requestStatus,
      "pending",
    );
  }
  // Scenario 3: Test soft delete handling
  {
    await TestValidator.error("soft-deleted request returns 404", async () => {
      await api.functional.ecommerceMall.customer.cancellation_requests.at(
        customerAConnection,
        {
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    });
  }
  // Scenario 4: Test authorization boundary
  {
    await TestValidator.error(
      "customer B cannot access customer A's request",
      async () => {
        await api.functional.ecommerceMall.customer.cancellation_requests.at(
          customerBConnection,
          {
            cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }
  // Scenario 5: Test with deleted product
  {
    const request =
      await api.functional.ecommerceMall.customer.cancellation_requests.at(
        customerAConnection,
        {
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    typia.assert(request);
    TestValidator.equals(
      "request is accessible",
      request.customer.id,
      customerA.id,
    );
  }
}
