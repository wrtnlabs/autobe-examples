import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
export async function authorize_moderator_join(
  connection: api.IConnection,
  props: {
    body: ICommunityBbsModerator.IJoin;
  },
): Promise<ICommunityBbsModerator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.io`,
    password_hash:
      props.body?.password_hash ?? RandomGenerator.alphaNumeric(32),
  } satisfies ICommunityBbsModerator.IJoin;
  return await api.functional.communityBbs.auth.moderator.join(connection, {
    body: joinInput,
  });
}
