import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_user_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformUser.IJoin>;
  },
): Promise<ICommunityPlatformUser.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    username: props.body?.username ?? RandomGenerator.alphaNumeric(12),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    bio: props.body?.bio ?? RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url:
      props.body?.avatar_url ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  return await api.functional.communityPlatform.auth.user.join(connection, {
    body: joinInput,
  });
}
