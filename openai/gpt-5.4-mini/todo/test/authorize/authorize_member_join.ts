import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account using the provided join payload and returns the
 * authorized response from the SDK. The underlying SDK call also updates the
 * connection with the issued access token, enabling subsequent authenticated
 * requests in the same test flow.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body: ITodoAppMember.IJoin;
  },
): Promise<ITodoAppMember.IAuthorized> {
  return await api.functional.todoApp.auth.member.join(connection, {
    body: props.body,
  });
}
