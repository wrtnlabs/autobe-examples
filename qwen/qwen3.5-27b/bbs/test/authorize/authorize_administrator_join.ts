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
    body?: DeepPartial<IDiscussionBoardAdministrator.IJoin>;
  },
): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      props.body?.password ?? typia.random<string & tags.Format<"password">>(),
    display_name: props.body?.display_name,
    bio: props.body?.bio,
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  return await api.functional.discussionBoard.auth.administrator.join(
    connection,
    { body: joinInput },
  );
}
