import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
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
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? `Aa1!${RandomGenerator.alphaNumeric(12)}`,
    displayName: props.body?.displayName ?? RandomGenerator.name(),
    phoneNumber: props.body?.phoneNumber ?? RandomGenerator.mobile(),
    avatar: props.body?.avatar ?? typia.random<string & tags.Format<"uri">>(),
    organization: {
      name:
        props.body?.organization?.name ??
        RandomGenerator.name() + " Organization",
      description: props.body?.organization?.description,
      logo:
        props.body?.organization?.logo ??
        typia.random<string & tags.Format<"uri">>(),
      currency:
        props.body?.organization?.currency ??
        RandomGenerator.pick(["USD", "EUR", "KRW"]),
      timezone:
        props.body?.organization?.timezone ??
        RandomGenerator.pick([
          "America/New_York",
          "Europe/London",
          "Asia/Seoul",
        ]),
      fiscalStartMonth:
        props.body?.organization?.fiscalStartMonth ??
        RandomGenerator.pick([1, 4, 7, 10]),
    },
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmGuest.IJoin;
  return await api.functional.erpHrm.auth.guest.join(connection, {
    body: joinInput,
  });
}
