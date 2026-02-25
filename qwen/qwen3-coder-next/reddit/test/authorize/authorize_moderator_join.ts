import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_moderator_join(
  connection: api.IConnection,
  props: {
    body: IRedditCloneModerator.IJoin;
  },
): Promise<IRedditCloneModerator.IAuthorized> {
  const joinInput = {
    email: props.body.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
    username: props.body.username ?? RandomGenerator.alphaNumeric(8),
    displayName: props.body.displayName ?? RandomGenerator.name(),
  } satisfies IRedditCloneModerator.IJoin;
  return await api.functional.redditClone.auth.moderator.join(connection, {
    body: joinInput,
  });
}
