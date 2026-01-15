import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeliveryStatus";
export async function test_api_delivery_status_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection as this is a public endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random delivery status using the SDK's random generator
  const expectedStatus =
    api.functional.communityPlatform.delivery_statuses.at.random();
  // Call the API endpoint to retrieve the delivery status by ID using the guest connection
  const retrievedStatus =
    await api.functional.communityPlatform.delivery_statuses.at(
      guestConnection,
      {
        statusId: expectedStatus.id,
      },
    );
  // Validate the response matches the expected structure
  typia.assert(retrievedStatus);
  // Verify all required fields are present and correctly typed
  TestValidator.equals(
    "retrieved status ID matches",
    retrievedStatus.id,
    expectedStatus.id,
  );
  TestValidator.equals(
    "retrieved status name matches",
    retrievedStatus.name,
    expectedStatus.name,
  );
  TestValidator.equals(
    "retrieved status description matches",
    retrievedStatus.description,
    expectedStatus.description,
  );
  TestValidator.equals(
    "retrieved status sequence matches",
    retrievedStatus.sequence,
    expectedStatus.sequence,
  );
  TestValidator.equals(
    "retrieved status code matches",
    retrievedStatus.status_code,
    expectedStatus.status_code,
  );
  TestValidator.equals(
    "retrieved status created_at matches",
    retrievedStatus.created_at,
    expectedStatus.created_at,
  );
}
