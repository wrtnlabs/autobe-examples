import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection with a valid UUID that doesn't exist in the database
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  // Attempt to retrieve a non-existent email verification and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent verification",
    404,
    async () => {
      await api.functional.todoApp.email_verifications.at(connection, {
        verificationId: nonExistentId,
      });
    },
  );
}
