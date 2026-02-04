import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
export async function authorize_moderator_login(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerator.ILogin>;
  },
): Promise<ICommunityPlatformModerator.IAuthorized> {
  const loginInput = {
    email:
      props.body?.email ?? `${RandomGenerator.alphaNumeric(16)}@example.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(24),
  } satisfies ICommunityPlatformModerator.ILogin;
  return await api.functional.communityPlatform.auth.moderator.login(
    connection,
    { body: loginInput },
  );
}
