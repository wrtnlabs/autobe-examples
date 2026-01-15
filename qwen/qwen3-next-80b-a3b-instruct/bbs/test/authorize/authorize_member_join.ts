import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body: IDiscussionBoardUser.IJoin;
  },
): Promise<IDiscussionBoardUser.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href:
      props.body?.href ??
      `https://example.com/join?source=${RandomGenerator.alphaNumeric(12)}`,
    referrer:
      props.body?.referrer ??
      `https://example.com/referrer?source=${RandomGenerator.alphaNumeric(12)}`,
  } satisfies IDiscussionBoardUser.IJoin;
  return await api.functional.auth.member.join(connection, { body: joinInput });
}
