import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: IEconPoliticBoardGuest.IJoin;
  },
): Promise<IEconPoliticBoardGuest.IAuthorized> {
  const joinInput = {
    deviceFingerprint:
      props.body?.deviceFingerprint ?? RandomGenerator.alphaNumeric(32),
    ip: props.body?.ip ?? RandomGenerator.mobile(),
    href: props.body?.href ?? "https://example.com/guest",
    referrer: props.body?.referrer ?? "https://example.com",
  };
  return await api.functional.econPoliticBoard.auth.guest.join(connection, {
    body: joinInput,
  });
}
