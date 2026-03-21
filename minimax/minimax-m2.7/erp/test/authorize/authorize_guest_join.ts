import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmGuest.IJoin>;
  },
): Promise<IErpHrmGuest.IAuthorized> {
  const joinInput = {
    deviceId:
      props.body?.deviceId ?? typia.random<string & tags.Format<"uuid">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    temporaryEmail: props.body?.temporaryEmail,
    ip: props.body?.ip,
  } satisfies IErpHrmGuest.IJoin;
  return await api.functional.erpHrm.auth.guest.join(connection, {
    body: joinInput,
  });
}
