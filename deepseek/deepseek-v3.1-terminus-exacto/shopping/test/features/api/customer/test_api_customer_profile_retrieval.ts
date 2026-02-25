import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Since there's no utility function to create a customer,
  // we assume the test environment has pre-existing customers.
  // We'll generate a random UUID to test retrieval.
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // Create a separate connection for the customer retrieval (base connection only)
  const customerConnection: api.IConnection = { host: connection.host };
  // Call the customer profile retrieval endpoint
  const profile = await api.functional.ecommerce.customers.at(
    customerConnection,
    {
      customerId,
    },
  );
  // Perform complete runtime type validation
  typia.assert(profile);
  // Validate specific business logic expectations
  TestValidator.equals("ID matches request", profile.id, customerId);
  TestValidator.predicate(
    "email is non-empty string",
    profile.email.length > 0,
  );
  TestValidator.predicate(
    "display_name is non-empty string",
    profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "phone_number is non-empty string",
    profile.phone_number.length > 0,
  );
  // Validate timestamp formats using regex (typia.assert already validated Format<'date-time'>)
  // Additional validation: ensure created_at and updated_at are valid ISO strings
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      profile.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      profile.updated_at,
    ),
  );
  // Validate deleted_at is either null or a valid date-time string
  if (profile.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is valid ISO date-time when not null",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        profile.deleted_at,
      ),
    );
  }
}
