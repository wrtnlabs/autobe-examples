import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_carrier_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Step 2: Use a known carrier ID that exists in the test environment
  // This ID should be set up in the test database before running this test
  const carrierId = "b2b9d578-9c1d-40cc-b2d5-789c1d40ccb2";
  // Step 3: Retrieve the carrier
  const retrievedCarrier: IShoppingMallCarrier =
    await api.functional.shoppingMall.admin.carriers.at(adminConnection, {
      carrierId,
    });
  typia.assert(retrievedCarrier);
  // Step 4: Validate required fields structure and formats - we cannot validate exact values because we don't know the database state
  // Carrier name must be present and have at least 1 character
  TestValidator.predicate(
    "carrier name is not empty",
    retrievedCarrier.carrier_name.length >= 1,
  );
  // Carrier code must be present and have at least 1 character
  TestValidator.predicate(
    "carrier code is not empty",
    retrievedCarrier.carrier_code.length >= 1,
  );
  // Description is optional, validate if present
  if (retrievedCarrier.description !== undefined) {
    TestValidator.predicate(
      "description length is within limit",
      retrievedCarrier.description.length <= 500,
    );
  }
  // Delivery enabled must be a boolean
  TestValidator.predicate(
    "delivery enabled is boolean",
    typeof retrievedCarrier.delivery_enabled === "boolean",
  );
  // Capacity range must be present and not empty
  TestValidator.predicate(
    "capacity range is not empty",
    retrievedCarrier.capacity_range.length >= 1,
  );
  // Service areas must have at least one item
  TestValidator.predicate(
    "service areas has at least one item",
    retrievedCarrier.service_areas.length >= 1,
  );
  // Currency supported must have at least one item
  TestValidator.predicate(
    "currency supported has at least one item",
    retrievedCarrier.currency_supported.length >= 1,
  );
  // API integration must be one of the allowed values
  TestValidator.predicate(
    "api integration is valid",
    ["none", "rest", "soap", "custom"].includes(
      retrievedCarrier.api_integration,
    ),
  );
  // API endpoint must be a valid URI
  TestValidator.predicate(
    "api endpoint is valid URI",
    typia.is<string & tags.Format<"uri">>(retrievedCarrier.api_endpoint),
  );
  // API auth method must be one of the allowed values
  TestValidator.predicate(
    "api auth method is valid",
    ["none", "bearer_token", "api_key", "oauth2", "mutual_tls"].includes(
      retrievedCarrier.api_auth_method,
    ),
  );
  // Default delivery days must be an integer between 1 and 30
  TestValidator.predicate(
    "default delivery days is between 1 and 30",
    retrievedCarrier.default_delivery_days >= 1 &&
      retrievedCarrier.default_delivery_days <= 30,
  );
  // Status must be one of the allowed values
  TestValidator.predicate(
    "status is valid",
    ["active", "inactive", "on_hold"].includes(retrievedCarrier.status),
  );
  // Tenant ID must be a valid UUID
  TestValidator.predicate(
    "tenant id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(retrievedCarrier.tenant_id),
  );
  // Priority must be between -100 and 100
  TestValidator.predicate(
    "priority is between -100 and 100",
    retrievedCarrier.priority >= -100 && retrievedCarrier.priority <= 100,
  );
  // Documentation URL must be a valid URI
  TestValidator.predicate(
    "documentation url is valid URI",
    typia.is<string & tags.Format<"uri">>(retrievedCarrier.documentation_url),
  );
  // Notes is optional, validate if present
  if (retrievedCarrier.notes !== undefined) {
    TestValidator.predicate(
      "notes length is within limit",
      retrievedCarrier.notes.length <= 1000,
    );
  }
}
