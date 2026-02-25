import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: Partial<ICommunityPlatformAdmin.IJoin>;
  },
): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    displayName: props.body?.displayName ?? RandomGenerator.name(1),
    bio: props.body?.bio ?? null,
    avatarUrl: props.body?.avatarUrl ?? null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  return await api.functional.communityPlatform.auth.admin.join(connection, {
    body: joinInput,
  });
}
