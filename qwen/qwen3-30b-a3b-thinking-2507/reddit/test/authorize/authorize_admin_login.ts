import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthToken";
import type { IRedditPlatformCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityAdmin";
import type { IRedditPlatformSiteAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSiteAdmin";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserProfile";
import type { IRedditPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserSession";
export async function authorize_admin_login(
  connection: api.IConnection,
  props: {
    body: IRedditPlatformCommunityAdmin.ILogin;
  },
): Promise<IRedditPlatformSiteAdmin.IAuthorized> {
  const result = await api.functional.auth.siteadmin.login(connection, {
    body: props.body,
  });
  connection.headers = {
    ...connection.headers,
    Authorization: `Bearer ${result.token.access}`,
  };
  return result;
}
