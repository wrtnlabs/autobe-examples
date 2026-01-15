import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
export async function authorize_admin_refresh(
  connection: api.IConnection,
  props: {
    body: ICommunityPlatformAdmin.IRefresh;
  },
): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const refreshToken =
    props.body?.refreshToken ?? RandomGenerator.alphaNumeric(64);
  return await api.functional.auth.admin.refresh(connection, {
    body: { refreshToken },
  });
}
