import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeGuest.IJoin>;
  },
): Promise<IErpHrmTimeGuest.IAuthorized> {
  const joinInput = {
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    token: props.body?.token ?? RandomGenerator.alphaNumeric(16),
    invitationCode:
      props.body?.invitationCode ?? RandomGenerator.alphaNumeric(12),
  } satisfies IErpHrmTimeGuest.IJoin;
  return await api.functional.erpHrmTime.auth.guest.join(connection, {
    body: joinInput,
  });
}
