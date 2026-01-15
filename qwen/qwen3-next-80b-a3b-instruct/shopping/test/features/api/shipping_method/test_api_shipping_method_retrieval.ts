import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
export async function test_api_shipping_method_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a realistic shipping method ID using UUID format
  const shippingMethodId: string = typia.random<string & tags.Format<"uuid">>();
  // Use the provided connection to retrieve the shipping method by ID
  const retrievedShippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shipping_methods.at(connection, {
      shippingMethodId,
    });
  // Validate that the response conforms to the IShoppingMallShippingMethod schema
  typia.assert(retrievedShippingMethod);
  // Validate critical properties exist and match expected constraints
  TestValidator.predicate(
    "shipping method has valid UUID ID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      retrievedShippingMethod.id,
    ),
  );
  TestValidator.predicate(
    "shipping method has a non-empty name",
    retrievedShippingMethod.name.length >= 1 &&
      retrievedShippingMethod.name.length <= 100,
  );
  TestValidator.predicate(
    "shipping method has a non-empty description",
    retrievedShippingMethod.description.length >= 1 &&
      retrievedShippingMethod.description.length <= 500,
  );
  TestValidator.predicate(
    "estimated delivery days min is between 1 and 30",
    retrievedShippingMethod.estimated_delivery_days_min >= 1 &&
      retrievedShippingMethod.estimated_delivery_days_min <= 30,
  );
  TestValidator.predicate(
    "estimated delivery days max is between 1 and 30",
    retrievedShippingMethod.estimated_delivery_days_max >= 1 &&
      retrievedShippingMethod.estimated_delivery_days_max <= 30,
  );
  TestValidator.predicate(
    "base fee is non-negative and reasonable",
    retrievedShippingMethod.base_fee >= 0 &&
      retrievedShippingMethod.base_fee <= 999.99,
  );
  TestValidator.predicate(
    "priority is between 1 and 10",
    retrievedShippingMethod.priority >= 1 &&
      retrievedShippingMethod.priority <= 10,
  );
  TestValidator.predicate(
    "service level is one of allowed values",
    ["standard", "express", "overnight", "economy"].includes(
      retrievedShippingMethod.service_level,
    ),
  );
}
