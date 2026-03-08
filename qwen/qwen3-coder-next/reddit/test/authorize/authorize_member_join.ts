import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body: IRedditLikeMember.IJoin;
  },
): Promise<IRedditLikeMember.IAuthorized> {
  const joinInput = {
    email: props.body.email ?? typia.random<string & tags.Format<"email">>(),
    username: props.body.username ?? RandomGenerator.alphaNumeric(8),
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body.display_name ?? RandomGenerator.name(),
    bio: props.body.bio ?? null,
    avatar_url: props.body.avatar_url ?? null,
  } satisfies IRedditLikeMember.IJoin;
  return await api.functional.redditLike.auth.member.join(connection, {
    body: joinInput,
  });
}
