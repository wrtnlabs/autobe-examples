import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_guest_user_registration(
  connection: api.IConnection,
) {
  // Call the guest join endpoint with empty body as it requires no credentials
  const response: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IRedditCommunityGuest.IJoin,
    });
  // Assert that the response matches the expected authorized guest user schema
  typia.assert(response);

  // Validate the guest user ID is a UUID
  TestValidator.predicate(
    "guest user ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  // Validate the token properties are populated
  TestValidator.predicate(
    "token access token is present",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );

  TestValidator.predicate(
    "token refresh token is present",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );

  // Validate timestamps are ISO string and parseable dates
  const createdAtDate = new Date(response.created_at);
  TestValidator.predicate(
    "created_at is a valid date",
    !isNaN(createdAtDate.getTime()),
  );

  if (response.updated_at !== undefined) {
    const updatedAtDate = new Date(response.updated_at);
    TestValidator.predicate(
      "updated_at is a valid date or undefined",
      !isNaN(updatedAtDate.getTime()),
    );
  }
}
