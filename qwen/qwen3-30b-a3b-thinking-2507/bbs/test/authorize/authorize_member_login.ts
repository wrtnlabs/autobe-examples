import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
export async function authorize_member_login(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardMember.ILogin>;
  },
): Promise<IDiscussionBoardMember.IAuthorized> {
  const loginInput = {
    email:
      props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href:
      props.body?.href ??
      `https://test.example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer:
      props.body?.referrer ??
      `https://test.example.com/${RandomGenerator.alphaNumeric(8)}`,
    ip: props.body?.ip,
  } satisfies IDiscussionBoardMember.ILogin;
  return await api.functional.auth.member.login(connection, {
    body: loginInput,
  });
}
