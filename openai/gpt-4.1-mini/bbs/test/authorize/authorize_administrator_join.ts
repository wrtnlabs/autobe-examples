import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_administrator_join(
  connection: api.IConnection,
  props: {
    body?: Partial<IDiscussionBoardAdministrator.IJoin>;
  },
): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  const body = props.body ?? {};
  return await api.functional.discussionBoard.auth.administrator.join(
    connection,
    { body },
  );
}
