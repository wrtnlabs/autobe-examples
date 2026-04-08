import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials and request-origin
 * metadata (href/referrer/ip), then invokes the backend join endpoint.
 * On success, the returned authorization payload includes the issued token
 * pair for subsequent authenticated workflows.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoUserProfile.IJoin>;
  },
): Promise<IMultiUserTodoUserProfile.IAuthorized> {
  const joinInput = {
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    password:
      props.body?.password ??
      typia.random<string & tags.MinLength<1> & tags.Format<"password">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoUserProfile.IJoin;
  return await api.functional.multiUserTodo.auth.member.join(connection, {
    body: joinInput,
  });
}
