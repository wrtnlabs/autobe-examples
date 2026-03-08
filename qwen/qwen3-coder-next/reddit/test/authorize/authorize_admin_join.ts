import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeAdmin.IJoin>;
  },
): Promise<IRedditLikeAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? (typia.random<string>() satisfies string & tags.MinLength<1> & tags.Format<"email"> as string & tags.MinLength<1> & tags.Format<"email">),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    username: props.body?.username ?? RandomGenerator.name(1),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    bio: props.body?.bio ?? null,
    avatar_url: props.body?.avatar_url ?? null,
  } satisfies IRedditLikeAdmin.IJoin;
  return await api.functional.redditLike.auth.admin.join(connection, {
    body: joinInput,
  });
}