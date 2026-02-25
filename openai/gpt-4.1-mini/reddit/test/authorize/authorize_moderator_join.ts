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
    body: Partial<ICommunityPlatformModerator.IJoin>;
  },
): Promise<ICommunityPlatformModerator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    username: props.body?.username ?? RandomGenerator.name(1),
    displayName: props.body?.displayName ?? null,
    bio: props.body?.bio ?? null,
    avatarUrl: props.body?.avatarUrl ?? null,
  } satisfies ICommunityPlatformModerator.IJoin;
  return await api.functional.communityPlatform.auth.moderator.join(
    connection,
    { body: joinInput },
  );
}
