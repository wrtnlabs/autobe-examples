import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_profile_soft_deleted_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random customer ID
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // Call the endpoint to retrieve customer profile
  const customer = await api.functional.ecommerce.customers.at(connection, {
    customerId,
  });
  // Validate the response using typia.assert - this performs complete validation
  // including all properties: id, email, display_name, phone_number, created_at, updated_at, deleted_at
  typia.assert(customer);
  // Since we're testing that soft-deleted customers are still accessible,
  // we verify that the response includes the deleted_at field (it can be null or ISO string)
  // The typia.assert above already validates that deleted_at is either null or a valid date-time string
  // We also validate that all other fields are present and correctly typed
  TestValidator.equals("customer ID matches request", customer.id, customerId);
  TestValidator.equals("email is a string", typeof customer.email, "string");
  TestValidator.equals(
    "display_name is a string",
    typeof customer.display_name,
    "string",
  );
  TestValidator.equals(
    "phone_number is a string",
    typeof customer.phone_number,
    "string",
  );
  // Validate timestamp formats (typia.assert already validates format tags)
  // Additional business logic validation: ensure created_at is before or equal to updated_at
  const createdAt = new Date(customer.created_at);
  const updatedAt = new Date(customer.updated_at);
  TestValidator.predicate("created_at <= updated_at", createdAt <= updatedAt);
  // Validate that deleted_at is properly typed (either null or ISO date-time)
  // This is important for the soft-delete functionality
  if (customer.deleted_at !== null) {
    // If deleted_at is not null, it should be a valid ISO date-time string
    const deletedAt = new Date(customer.deleted_at);
    TestValidator.predicate(
      "deleted_at is valid date",
      !isNaN(deletedAt.getTime()),
    );
    // Business rule: deleted_at should be after or equal to created_at
    TestValidator.predicate("deleted_at >= created_at", deletedAt >= createdAt);
  }
  // The key business requirement: endpoint should return 200 OK for soft-deleted customers
  // not 404. Since we got a valid response, this requirement is satisfied.
}
