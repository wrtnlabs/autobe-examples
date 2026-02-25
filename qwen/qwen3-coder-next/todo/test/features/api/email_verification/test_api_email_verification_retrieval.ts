import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_email_verification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const verification = await api.functional.todoApp.email_verifications.at(
    connection,
    {
      verificationId,
    },
  );
  typia.assert(verification);
  TestValidator.equals("id matches", verification.id, verificationId);
  TestValidator.predicate(
    "todo_app_user_id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(verification.todo_app_user_id),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      verification.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      verification.updated_at,
    ),
  );
  if (verification.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is valid date-time or null",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        verification.deleted_at,
      ),
    );
  }
}
