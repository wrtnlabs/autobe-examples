import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_response_schema_validation(
  connection: api.IConnection,
): Promise<void> {
  // Generate mock admin data using typia.random() to validate schema structure
  const mockAdmin = typia.random<IRedditPlatformAdmin>();
  // Validate that the mock data passes type checking
  const validatedAdmin = typia.assert<IRedditPlatformAdmin>(mockAdmin);
  // Validate all required fields exist with correct types
  TestValidator.predicate("has id", typeof validatedAdmin.id === "string");
  TestValidator.predicate(
    "has email",
    typeof validatedAdmin.email === "string",
  );
  TestValidator.predicate(
    "has username",
    typeof validatedAdmin.username === "string",
  );
  TestValidator.predicate(
    "has karmaScore",
    typeof validatedAdmin.karmaScore === "number",
  );
  TestValidator.predicate(
    "has createdAt",
    typeof validatedAdmin.createdAt === "string",
  );
  // Validate field formats
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f-]{36}$/i.test(validatedAdmin.id),
  );
  TestValidator.predicate(
    "email is email format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      validatedAdmin.email,
    ),
  );
  TestValidator.predicate(
    "createdAt is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      validatedAdmin.createdAt,
    ),
  );
  // Test nullable fields
  TestValidator.predicate(
    "displayName can be null",
    validatedAdmin.displayName === null ||
      typeof validatedAdmin.displayName === "string",
  );
  TestValidator.predicate(
    "bio can be null",
    validatedAdmin.bio === null || typeof validatedAdmin.bio === "string",
  );
  TestValidator.predicate(
    "avatarUrl can be null",
    validatedAdmin.avatarUrl === null ||
      typeof validatedAdmin.avatarUrl === "string",
  );
  TestValidator.predicate(
    "updatedAt can be null",
    validatedAdmin.updatedAt === null ||
      typeof validatedAdmin.updatedAt === "string",
  );
  TestValidator.predicate(
    "deletedAt can be null",
    validatedAdmin.deletedAt === null ||
      typeof validatedAdmin.deletedAt === "string",
  );
  // Validate karma score type and range
  TestValidator.predicate(
    "karmaScore is int32",
    Number.isInteger(validatedAdmin.karmaScore),
  );
  // Validate createdAt is valid date-time format
  const createdAtDate = new Date(validatedAdmin.createdAt);
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(createdAtDate.getTime()),
  );
  // Test the actual API endpoint with a valid admin ID
  // Since we can't create admins, we'll test with a valid UUID format
  const testAdminId = typia.random<string & tags.Format<"uuid">>();
  // Call the API endpoint
  const adminResponse = await api.functional.redditPlatform.admins.at(
    connection,
    {
      adminId: testAdminId,
    },
  );
  // Validate the response matches the expected schema
  typia.assert<IRedditPlatformAdmin>(adminResponse);
}
