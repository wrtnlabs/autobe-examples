import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
export async function authorize_member_login(
  connection: api.IConnection,
  props: {
    body: ICommunityBbsMember.ILogin;
  },
): Promise<ICommunityBbsMember.IAuthorized> {
  const loginInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.ILogin;
  return await api.functional.communityBbs.auth.member.login(connection, {
    body: loginInput,
  });
}
