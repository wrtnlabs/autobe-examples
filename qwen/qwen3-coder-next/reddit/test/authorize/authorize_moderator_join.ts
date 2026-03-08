import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_moderator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeModerator.IJoin>;
  },
): Promise<IRedditLikeModerator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    username: props.body?.username ?? RandomGenerator.name(1),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    bio:
      props.body?.bio ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }) ??
      null,
    avatar_url:
      props.body?.avatar_url ??
      RandomGenerator.pick([
        "https://example.com/avatar1.png",
        "https://example.com/avatar2.png",
        null,
      ]) ??
      null,
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditLikeModerator.IJoin;
  return await api.functional.redditLike.auth.moderator.join(connection, {
    body: joinInput,
  });
}
