import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_join(
  connection: api.IConnection,
) {
  // Generate realistic email for new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Use a simple plaintext password for joining
  const password = "P@ssw0rd123";
  // Use realistic href and referrer URLs as required by the IJoin DTO
  const href: string & tags.Format<"uri"> =
    "https://reddit.example.com/register";
  const referrer: string & tags.Format<"uri"> = "https://reddit.example.com/";

  // Optional client IP can be null here (not passing disables in API)
  const ip: string | null = null;

  // Compose the join request body
  const body = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email,
    password,
    ip,
    href,
    referrer,
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  // Call the join API
  const output: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, { body });

  // Validate the output type and correctness
  typia.assert(output);

  // Validate essential properties are as expected
  TestValidator.predicate(
    "joined user has valid UUID",
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.equals("user email is same as input", output.email, email);
  TestValidator.equals("user status is active", output.status, "active");
  TestValidator.predicate(
    "user role is truthy string",
    typeof output.role === "string" && output.role.length > 0,
  );
  TestValidator.predicate(
    "user has token",
    output.token !== undefined && output.token !== null,
  );
  TestValidator.predicate(
    "token access is string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO string",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is ISO string",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );
}
