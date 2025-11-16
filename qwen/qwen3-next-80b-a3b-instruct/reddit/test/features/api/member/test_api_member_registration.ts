import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_registration(
  connection: api.IConnection,
) {
  // Generate realistic test data using type-safe constraints
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();

  // Test successful member registration
  const response: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });

  // Validate response structure and type safety
  typia.assert(response);

  // Verify registration success: Check essential properties
  TestValidator.equals(
    "member id is a valid UUID",
    typeof response.id,
    "string",
  );
  TestValidator.predicate(
    "member id matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  TestValidator.equals(
    "member email matches registration",
    response.email,
    email,
  );
  TestValidator.equals(
    "token.access exists",
    typeof response.token.access,
    "string",
  );
  TestValidator.equals(
    "token.refresh exists",
    typeof response.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token.expired_at is ISO date-time",
    typeof response.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token.refreshable_until is ISO date-time",
    typeof response.token.refreshable_until,
    "string",
  );

  // Validate timestamp formats
  TestValidator.predicate(
    "expired_at matches date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      response.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until matches date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      response.token.refreshable_until,
    ),
  );
}
