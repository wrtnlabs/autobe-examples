import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body: IDiscussionBoardMember.IJoin;
  },
): Promise<IDiscussionBoardMember.IAuthorized> {
  const joinInput = {
    href:
      props.body.href ??
      `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer:
      props.body.referrer ??
      `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
    ip: props.body.ip ?? null,
  };
  return await api.functional.auth.member.join(connection, {
    body: joinInput,
  });
}
