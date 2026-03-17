import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";

export async function test_api_payment_attempt_detail_failed_outcome_preserved(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customer);
  const created: IShoppingMallPaymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          gateway_provider: `provider-${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(created);
  const found: IShoppingMallPaymentAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.at(
      customerConnection,
      {
        paymentAttemptId: created.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("payment attempt id preserved", found.id, created.id);
  TestValidator.equals(
    "payment attempt status preserved",
    found.status,
    created.status,
  );
  TestValidator.equals(
    "payment attempt amount preserved",
    found.amount,
    created.amount,
  );
  TestValidator.equals(
    "gateway provider preserved",
    found.gateway_provider,
    created.gateway_provider,
  );
  TestValidator.equals(
    "gateway reference preserved",
    found.gateway_reference,
    created.gateway_reference,
  );
  TestValidator.equals(
    "failure reason preserved",
    found.failure_reason,
    created.failure_reason,
  );
  TestValidator.equals(
    "processed timestamp preserved",
    found.processed_at,
    created.processed_at,
  );
  TestValidator.equals(
    "created timestamp preserved",
    found.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated timestamp preserved",
    found.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp preserved",
    found.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals("customer id preserved", found.customer.id, customer.id);
  TestValidator.equals(
    "customer email preserved",
    found.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer id matches created attempt",
    found.customer.id,
    created.customer.id,
  );
  TestValidator.equals(
    "customer email matches created attempt",
    found.customer.email,
    created.customer.email,
  );
  TestValidator.equals(
    "customer banned timestamp preserved",
    found.customer.banned_at,
    created.customer.banned_at,
  );
  TestValidator.equals(
    "customer created timestamp preserved",
    found.customer.created_at,
    created.customer.created_at,
  );
  TestValidator.equals(
    "customer updated timestamp preserved",
    found.customer.updated_at,
    created.customer.updated_at,
  );
  TestValidator.equals(
    "customer deleted timestamp preserved",
    found.customer.deleted_at,
    created.customer.deleted_at,
  );
}
