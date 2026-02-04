import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
export async function authorize_owner_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOwner.IJoin>;
  },
): Promise<ICommunityPlatformOwner.IAuthorized> {
  const joinInput = {
    email:
      props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@community.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformOwner.IJoin;
  return await api.functional.communityPlatform.auth.owner.join(connection, {
    body: joinInput,
  });
}
