import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_owner_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeOwner.IJoin>;
  },
): Promise<IRedditLikeOwner.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      props.body?.password ?? typia.random<string & tags.Format<"password">>(),
    nickname: props.body?.nickname ?? RandomGenerator.name(),
  } satisfies IRedditLikeOwner.IJoin;
  return await api.functional.redditLike.auth.owner.join(connection, {
    body: joinInput,
  });
}
