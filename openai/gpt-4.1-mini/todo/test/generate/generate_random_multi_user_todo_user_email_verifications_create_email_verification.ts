import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_user_email_verification } from "../prepare/prepare_random_multi_user_todo_user_email_verification";

export async function generate_random_multi_user_todo_user_email_verifications_create_email_verification(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoUserEmailVerification.ICreate> | undefined;
  },
): Promise<IMultiUserTodoUserEmailVerification> {
  const prepared: IMultiUserTodoUserEmailVerification.ICreate =
    prepare_random_multi_user_todo_user_email_verification(props.body);
  const result: IMultiUserTodoUserEmailVerification =
    await api.functional.multiUserTodo.user.email_verifications.createEmailVerification(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
