import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: IDiscussionBoardAdmin.IJoin;
  },
): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const joinInput = {
    email: props.body.email,
    password: props.body.password,
  } satisfies IDiscussionBoardAdmin.IJoin;
  return await api.functional.auth.admin.join(connection, { body: joinInput });
}
