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
    body?: Partial<ICommunityPlatformUser.IJoin>;
  },
): Promise<ICommunityPlatformUser.IAuthorized> {
  // Since IJoin is an empty type, pass an empty object if undefined
  const joinInput = props.body ?? {};
  return await api.functional.communityPlatform.auth.user.join(connection, {
    body: joinInput,
  });
}
