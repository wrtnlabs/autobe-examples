import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { prepare_random_todo_app_user_email_verification } from "../prepare/prepare_random_todo_app_user_email_verification";
export async function generate_random_todo_app_user_user_email_verifications_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppUserEmailVerification.ICreate> | undefined;
  },
): Promise<ITodoAppUserEmailVerification> {
  const prepared: ITodoAppUserEmailVerification.ICreate =
    prepare_random_todo_app_user_email_verification(props.body);
  const result: ITodoAppUserEmailVerification =
    await api.functional.todoApp.user.user_email_verifications.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
