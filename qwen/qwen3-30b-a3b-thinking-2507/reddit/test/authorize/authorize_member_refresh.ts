import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthToken";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserProfile";
import type { IRedditPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserSession";
export async function authorize_member_refresh(
  connection: api.IConnection,
  props: {
    body: IRedditPlatformUser.IRefresh;
  },
): Promise<IRedditPlatformUser.IAuthorized> {
  const result = await api.functional.auth.user.refresh(connection, {
    body: props.body,
  });
  if ((result.token as any).access) {
    connection.headers = {
      ...connection.headers,
      Authorization: `Bearer ${(result.token as any).access}`,
    };
  }
  return result;
}
