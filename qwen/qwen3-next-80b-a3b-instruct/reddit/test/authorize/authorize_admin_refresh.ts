import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
export async function authorize_admin_refresh(
  connection: api.IConnection,
  props: {
    body: ICommunityBbsAdmin.IRefresh;
  },
): Promise<ICommunityBbsAdmin.IAuthorized> {
  return await api.functional.communityBbs.auth.admin.refresh(connection, {
    body: props.body,
  });
}
