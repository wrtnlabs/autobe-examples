import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingMethod";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
export async function test_api_shipping_method_filter_by_region_and_deadline(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the test
  const testConnection: api.IConnection = { host: connection.host };
  // Create request body with filter parameters
  const requestBody = {
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    region: "US",
    max_delivery_days: 5,
  } satisfies IShoppingMallShippingMethod.IRequest;
  // Call the index endpoint with filtering parameters
  const response = await api.functional.shoppingMall.shipping_methods.index(
    testConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has total records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    response.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "data array has at least one item",
    response.data.length > 0,
  );
  // Validate data structure for each item
  for (const item of response.data) {
    TestValidator.equals("id is a valid UUID", typeof item.id, "string");
    TestValidator.predicate(
      "id matches UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.equals("name is a string", typeof item.name, "string");
    TestValidator.predicate("name is not empty", item.name.length > 0);
    TestValidator.predicate("name max length", item.name.length <= 100);
    TestValidator.predicate(
      "description is string or null",
      item.description === null || typeof item.description === "string",
    );
    TestValidator.predicate(
      "description max length",
      item.description !== null && item.description !== undefined ? item.description.length <= 500 : true,
    );
    TestValidator.equals("carrier_id is a valid UUID", typeof item.carrier_id, "string");
    TestValidator.predicate(
      "carrier_id matches UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.carrier_id,
      ),
    );
    TestValidator.equals("service_level is a string", typeof item.service_level, "string");
    TestValidator.predicate(
      "service_level is valid",
      [
        "standard",
        "expedited",
        "overnight",
        "same_day",
        "international",
      ].includes(item.service_level),
    );
    TestValidator.equals("is_active is boolean", typeof item.is_active, "boolean");
    TestValidator.equals("estimated_days_min is a number", typeof item.estimated_days_min, "number");
    TestValidator.predicate(
      "estimated_days_min is between 0 and 30",
      item.estimated_days_min >= 0 && item.estimated_days_min <= 30,
    );
    TestValidator.equals("estimated_days_max is a number", typeof item.estimated_days_max, "number");
    TestValidator.predicate(
      "estimated_days_max is between 0 and 30",
      item.estimated_days_max >= 0 && item.estimated_days_max <= 30,
    );
    TestValidator.equals("base_cost is a number", typeof item.base_cost, "number");
    TestValidator.predicate(
      "base_cost is between 0 and 9999.99",
      item.base_cost >= 0 && item.base_cost <= 9999.99,
    );
    TestValidator.predicate(
      "default_region is string or null",
      item.default_region === null || typeof item.default_region === "string",
    );
    TestValidator.predicate(
      "default_region is correct format",
      item.default_region !== null && item.default_region !== undefined ? /^[A-Z]{2}(-[A-Z]{2})?$/.test(item.default_region) : true,
    );
    TestValidator.predicate(
      "is_free_threshold_enabled is boolean or undefined",
      item.is_free_threshold_enabled === undefined ||
        typeof item.is_free_threshold_enabled === "boolean",
    );
    TestValidator.predicate(
      "free_shipping_threshold is number or undefined",
      item.free_shipping_threshold === undefined ||
        typeof item.free_shipping_threshold === "number",
    );
    TestValidator.predicate(
      "free_shipping_threshold is between 0 and 99999.99",
      item.free_shipping_threshold === undefined ||
        (item.free_shipping_threshold >= 0 &&
          item.free_shipping_threshold <= 99999.99),
    );
    TestValidator.predicate(
      "is_multi_city_enabled is boolean or undefined",
      item.is_multi_city_enabled === undefined ||
        typeof item.is_multi_city_enabled === "boolean",
    );
    TestValidator.predicate(
      "has_signature_required is boolean or undefined",
      item.has_signature_required === undefined ||
        typeof item.has_signature_required === "boolean",
    );
    TestValidator.predicate(
      "has_dimensional_weight is boolean or undefined",
      item.has_dimensional_weight === undefined ||
        typeof item.has_dimensional_weight === "boolean",
    );
    TestValidator.predicate(
      "recommended_for is string or undefined",
      item.recommended_for === undefined ||
        typeof item.recommended_for === "string",
    );
    TestValidator.predicate(
      "max_weight_lbs is number or undefined",
      item.max_weight_lbs === undefined ||
        typeof item.max_weight_lbs === "number",
    );
    TestValidator.predicate(
      "max_weight_lbs is between 0 and 150",
      item.max_weight_lbs === undefined ||
        (item.max_weight_lbs >= 0 && item.max_weight_lbs <= 150),
    );
    TestValidator.predicate(
      "max_dimensions_inches is number or undefined",
      item.max_dimensions_inches === undefined ||
        typeof item.max_dimensions_inches === "number",
    );
    TestValidator.predicate(
      "max_dimensions_inches is between 0 and 60",
      item.max_dimensions_inches === undefined ||
        (item.max_dimensions_inches >= 0 && item.max_dimensions_inches <= 60),
    );
    TestValidator.predicate(
      "taxable is boolean or undefined",
      item.taxable === undefined || typeof item.taxable === "boolean",
    );
    TestValidator.predicate(
      "tracking_link_template is string or undefined",
      item.tracking_link_template === undefined ||
        typeof item.tracking_link_template === "string",
    );
    TestValidator.predicate(
      "tracking_link_template is valid URI or undefined",
      item.tracking_link_template === undefined ||
        /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(item.tracking_link_template),
    );
    TestValidator.equals("priority_rank is a number", typeof item.priority_rank, "number");
    TestValidator.predicate(
      "priority_rank is between 1 and 100",
      item.priority_rank >= 1 && item.priority_rank <= 100,
    );
    TestValidator.predicate(
      "insured_value_limit is number or undefined",
      item.insured_value_limit === undefined ||
        typeof item.insured_value_limit === "number",
    );
    TestValidator.predicate(
      "insured_value_limit is between 0 and 99999.99",
      item.insured_value_limit === undefined ||
        (item.insured_value_limit >= 0 && item.insured_value_limit <= 99999.99),
    );
  }
}