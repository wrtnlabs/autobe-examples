import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_user_email_verification } from "../prepare/prepare_random_todo_user_email_verification";

export async function generate_random_todo_user_email_verifications_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoUserEmailVerification.ICreate> | undefined;
  },
): Promise<ITodoUserEmailVerification> {
  const prepared: ITodoUserEmailVerification.ICreate =
    prepare_random_todo_user_email_verification(props.body);
  return await api.functional.todo.user.email_verifications.create(connection, {
    body: prepared,
  });
}
