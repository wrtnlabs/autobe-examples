import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_system_administrator_token_generation_validation(
  connection: api.IConnection,
) {
  // Generate realistic admin account data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    display_name: RandomGenerator.name(2), // 2-word name for admin
    email: adminEmail,
    bio: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }), // Brief admin bio for economic/political expertise
    status: "active",
  } satisfies IEconPoliticalDiscussionUser.ICreate;

  // Create system administrator account
  const adminResponse =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: adminData,
    });

  // Validate complete response structure and types
  typia.assert(adminResponse);

  // Validate admin profile information matches input
  TestValidator.equals(
    "admin email matches input",
    adminResponse.email,
    adminEmail,
  );

  TestValidator.equals(
    "admin display name matches input",
    adminResponse.display_name,
    adminData.display_name,
  );

  TestValidator.equals(
    "admin status is active",
    adminResponse.status,
    "active",
  );

  // Validate JWT token structure
  TestValidator.predicate(
    "access token exists and is non-empty",
    adminResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists and is non-empty",
    adminResponse.token.refresh.length > 0,
  );

  // Validate token format appears to be JWT-like (has typical JWT structure)
  TestValidator.predicate(
    "access token appears to be JWT format",
    adminResponse.token.access.split(".").length === 3,
  );

  TestValidator.predicate(
    "refresh token appears to be JWT format",
    adminResponse.token.refresh.split(".").length === 3,
  );

  // Validate expiration times are proper date-time strings
  TestValidator.predicate(
    "access token expiration is valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      adminResponse.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refresh token expiration is valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      adminResponse.token.refreshable_until,
    ),
  );

  // Validate temporal relationship: refresh token should expire after access token
  TestValidator.predicate(
    "refresh token expires after access token",
    new Date(adminResponse.token.refreshable_until) >
      new Date(adminResponse.token.expired_at),
  );

  // Validate admin ID is proper UUID format
  TestValidator.predicate(
    "admin ID is valid UUID format",
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(adminResponse.id),
  );

  // Validate timestamps are present and well-formed
  TestValidator.predicate(
    "created_at timestamp is valid",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      adminResponse.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at timestamp is valid",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      adminResponse.updated_at,
    ),
  );

  // Validate that created_at and updated_at are close in time (account just created)
  const createdTime = new Date(adminResponse.created_at);
  const updatedTime = new Date(adminResponse.updated_at);
  const timeDiff = Math.abs(updatedTime.getTime() - createdTime.getTime());
  TestValidator.predicate(
    "created_at and updated_at are within reasonable range for new account",
    timeDiff < 5000, // Within 5 seconds
  );
}
