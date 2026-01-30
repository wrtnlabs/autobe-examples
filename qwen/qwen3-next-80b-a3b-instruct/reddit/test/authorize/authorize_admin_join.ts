import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: ICommunityBbsAdmin.IJoin;
  },
): Promise<ICommunityBbsAdmin.IAuthorized> {
  const joinInput = {
    email: props.body.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsAdmin.IJoin;
  return await api.functional.communityBbs.auth.admin.join(connection, {
    body: joinInput,
  });
}
