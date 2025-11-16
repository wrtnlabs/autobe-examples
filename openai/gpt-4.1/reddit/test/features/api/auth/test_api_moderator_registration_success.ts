import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test new moderator onboarding with a valid, unique platform registration
 * payload. Verifies successful table insertion, JWT token issuance, 'active'
 * status assignment, and audit/session metadata population. Validates strict
 * type safety and all contract fields.
 */
export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // Generate unique, valid registration data that satisfies all DTO constraints and business policies
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // strong/complex password
  const status = "active";
  const href = "https://platform.example.com/register"; // Must be URI format
  const referrer = "https://platform.example.com/landing";
  // Randomly provide an IPv4 or IPv6 for audit tracing, or null
  const possibleIps = [
    typia.random<string & tags.Format<"ipv4">>(),
    typia.random<string & tags.Format<"ipv6">>(),
    null,
  ];
  const ip = RandomGenerator.pick(possibleIps);

  const createBody = {
    email,
    password,
    status,
    business_status: null,
    href,
    referrer,
    ip,
  } satisfies ICommunityPlatformModerator.ICreate;

  const result = await api.functional.auth.moderator.join(connection, {
    body: createBody,
  });
  typia.assert(result);

  // Validate all returned fields and business rules
  TestValidator.equals(
    "email matches registration input",
    result.email,
    createBody.email,
  );
  TestValidator.equals("status set to active", result.status, "active");
  TestValidator.equals(
    "business_status must be null",
    result.business_status,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active moderator",
    result.deleted_at,
    null,
  );
  // Check that created_at and updated_at are present (type is date-time string, validated by typia.assert above)
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );
  // Validate token structure
  typia.assert<IAuthorizationToken>(result.token);
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a non-empty string",
    typeof result.token.expired_at === "string" &&
      result.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is a non-empty string",
    typeof result.token.refreshable_until === "string" &&
      result.token.refreshable_until.length > 0,
  );
}
