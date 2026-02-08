import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_registered_user_refresh(
  connection: api.IConnection,
  props: {
    body: IDiscussionBoardRegisteredUser.IRefresh;
  },
): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  return await api.functional.discussionBoard.auth.registeredUser.refresh(
    connection,
    {
      body: props.body,
    },
  );
}
