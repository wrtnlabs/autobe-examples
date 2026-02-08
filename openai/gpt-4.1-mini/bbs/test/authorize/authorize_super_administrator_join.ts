import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_super_administrator_join(
  connection: api.IConnection,
  props: {
    body: IDiscussionBoardSuperAdministrator.IJoin;
  },
): Promise<IDiscussionBoardSuperAdministrator.IAuthorized> {
  return await api.functional.discussionBoard.auth.superAdministrator.join(
    connection,
    {
      body: props.body,
    },
  );
}
