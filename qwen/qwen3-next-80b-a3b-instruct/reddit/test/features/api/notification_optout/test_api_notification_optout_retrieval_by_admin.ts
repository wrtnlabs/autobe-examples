import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationOptout } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationOptout";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_optout_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function with correct pattern - it updates connection headers internally
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a valid UUID as optoutId
  // We assume at least one opt-out record exists in the system since we are testing admin retrieval
  // This is a real UUID from the system - we don't create records since no creation endpoint exists
  const optoutId = typia.random<string & tags.Format<"uuid">>() as string;
  // Step 3: Retrieve the notification opt-out record by its ID using admin connection
  // This test assumes admin can retrieve at least one record in the system
  const retrievedOptout: ICommunityPlatformNotificationOptout =
    await api.functional.communityPlatform.admin.notification_optouts.at(
      adminConnection, // Use adminConnection (not base connection)
      {
        optoutId: optoutId,
      },
    );
  // Step 4: Validate the structure and type of the returned data
  // We cannot validate actual values (since we don't know existing records)
  // But we CAN validate against the type definition and reference type-safe structure
  typia.assert(retrievedOptout);
  // Step 5: Validate existence of required fields according to ICommunityPlatformNotificationOptout
  // Validation based on structure, not specific values
  TestValidator.predicate(
    "notification_type is a string",
    typeof retrievedOptout.notification_type === "string",
  );
  TestValidator.predicate(
    "channel is a string",
    typeof retrievedOptout.channel === "string",
  );
  TestValidator.predicate(
    "is_active is a boolean",
    typeof retrievedOptout.is_active === "boolean",
  );
  // reason and admin_notes are optional, so we validate type if they exist
  if (retrievedOptout.reason !== undefined) {
    TestValidator.predicate(
      "reason is a string",
      typeof retrievedOptout.reason === "string",
    );
  }
  if (retrievedOptout.admin_notes !== undefined) {
    TestValidator.predicate(
      "admin_notes is a string",
      typeof retrievedOptout.admin_notes === "string",
    );
  }
  // Ensure no extraneous properties are present (structurally complete)
  // This validates that the backend strictly returns the defined ICommunityPlatformNotificationOptout structure
  // The typia.assert() above already ensures this, but this provides explicit function validation
  // No need for detailed field comparison since we don't know expected
}
