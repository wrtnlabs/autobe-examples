import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_moderator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerator.IJoin>;
  },
): Promise<ICommunityPlatformModerator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    username: props.body?.username ?? RandomGenerator.alphabets(8),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    bio: props.body?.bio ?? RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url:
      props.body?.avatar_url ?? typia.random<string & tags.Format<"uri">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  return await api.functional.communityPlatform.auth.moderator.join(
    connection,
    { body: joinInput },
  );
}
