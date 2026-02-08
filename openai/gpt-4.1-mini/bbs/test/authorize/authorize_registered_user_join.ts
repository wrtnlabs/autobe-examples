import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_registered_user_join(
  connection: api.IConnection,
  props: {
    body?: Partial<IDiscussionBoardRegisteredUser.IJoin>;
  },
): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  // Since IJoin has no defined properties, just pass empty object if props.body is undefined
  const joinBody = props.body ?? {};
  return await api.functional.discussionBoard.auth.registeredUser.join(
    connection,
    {
      body: joinBody,
    },
  );
}
