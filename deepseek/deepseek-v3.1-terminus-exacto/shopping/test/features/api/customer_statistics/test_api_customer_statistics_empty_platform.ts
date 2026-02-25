import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_statistics_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register customer account using utility function
  await authorize_customer_join(customerConnection, { body: undefined });
  // Call statistics endpoint
  const statistics =
    await api.functional.ecommerce.customer.statistics.at(customerConnection);
  typia.assert(statistics);
  // Validate that all metric values are zero or baseline for empty platform
  TestValidator.equals(
    "metric value should be zero on empty platform",
    statistics.metric_value,
    0,
  );
  TestValidator.predicate(
    "metric name should be populated",
    statistics.metric_name.length > 0,
  );
  TestValidator.predicate(
    "metric category should be populated",
    statistics.metric_category.length > 0,
  );
  TestValidator.predicate(
    "metric unit should be populated",
    statistics.metric_unit.length > 0,
  );
  TestValidator.predicate(
    "source component should be populated",
    statistics.source_component.length > 0,
  );
  TestValidator.predicate(
    "environment should be populated",
    statistics.environment.length > 0,
  );
  TestValidator.equals(
    "threshold exceeded should be false",
    statistics.threshold_exceeded,
    false,
  );
}
