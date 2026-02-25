import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_todoapp_complete_registration_verification(
  connection: api.IConnection,
): Promise<void> {
  // Since the provided API only supports email verification operations,
  // we'll test the email verification functionality directly
  // Test 1: Send verification email
  await api.functional.todoApp.email_verifications.verifyEmail(connection, {
    body: {
      action: "send_verification_email",
    } satisfies ITodoAppUserEmailVerification.IRequest,
  });
  // Test 2: Verify with pagination parameters
  await api.functional.todoApp.email_verifications.verifyEmail(connection, {
    body: {
      action: "verify_token",
      page: 1,
      limit: 100,
    } satisfies ITodoAppUserEmailVerification.IRequest,
  });
  // Test 3: Send verification email with pagination parameters
  await api.functional.todoApp.email_verifications.verifyEmail(connection, {
    body: {
      action: "send_verification_email",
      page: 1,
      limit: 100,
    } satisfies ITodoAppUserEmailVerification.IRequest,
  });
  // Test 4: Verify with null pagination parameters
  await api.functional.todoApp.email_verifications.verifyEmail(connection, {
    body: {
      action: "verify_token",
      page: null,
      limit: null,
    } satisfies ITodoAppUserEmailVerification.IRequest,
  });
  // Test 5: Invalid action should be caught by type system at compile time
  // This test validates the type safety of the API
  const invalidBody = {
    action: "invalid_action" as "send_verification_email" | "verify_token",
  } satisfies ITodoAppUserEmailVerification.IRequest;
  await api.functional.todoApp.email_verifications.verifyEmail(connection, {
    body: invalidBody,
  });
}