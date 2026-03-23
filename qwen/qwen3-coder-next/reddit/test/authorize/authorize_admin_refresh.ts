import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_refresh(
  connection: api.IConnection,
  props: {
    body: IRedditLikeAdmin.IRefresh;
  },
): Promise<IRedditLikeAdmin.IAuthorized> {
  return await api.functional.redditLike.auth.admin.refresh(connection, {
    body: props.body,
  });
}
