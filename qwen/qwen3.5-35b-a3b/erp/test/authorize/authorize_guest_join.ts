import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsGuest.IJoin>;
  },
): Promise<IHrmsGuest.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmsGuest.IJoin;
  return await api.functional.hrms.auth.guest.join(connection, {
    body: joinInput,
  });
}
