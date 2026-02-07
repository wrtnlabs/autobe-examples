import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: ICommunityAdmin.IJoin;
  },
): Promise<ICommunityAdmin.IAuthorized> {
  // Generate a complete valid IJoin instance using typia.random
  const joinInput: ICommunityAdmin.IJoin = typia.random<ICommunityAdmin.IJoin>();
  return await api.functional.community.auth.admin.join(connection, {
    body: joinInput,
  });
}