import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: IDiscussionBoardMember.IJoin;
  },
): Promise<IDiscussionBoardMember.IAuthorized> {
  const joinInput = {
    href:
      props.body.href ??
      `https://example${RandomGenerator.alphaNumeric(8)}.com/${RandomGenerator.alphaNumeric(5)}`,
    referrer:
      props.body.referrer ??
      `https://example${RandomGenerator.alphaNumeric(8)}.com/${RandomGenerator.alphaNumeric(5)}`,
    ip: props.body.ip ?? null,
  };
  return await api.functional.auth.guest.join(connection, { body: joinInput });
}
