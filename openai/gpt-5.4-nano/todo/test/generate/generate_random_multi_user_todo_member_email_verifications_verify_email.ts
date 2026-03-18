import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_member_email_verification } from "../prepare/prepare_random_multi_user_todo_member_email_verification";

export async function generate_random_multi_user_todo_member_email_verifications_verify_email(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IMultiUserTodoMemberEmailVerification.ICreate>
      | undefined;
  },
): Promise<IMultiUserTodoMemberEmailVerification.IInvert> {
  const prepared: IMultiUserTodoMemberEmailVerification.ICreate =
    prepare_random_multi_user_todo_member_email_verification(props.body);
  return await api.functional.multiUserTodo.member.email_verifications.verifyEmail(
    connection,
    {
      body: prepared,
    },
  );
}
