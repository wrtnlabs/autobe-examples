import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppGuest.IJoin>;
  },
): Promise<ITodoAppGuest.IAuthorized> {
  const joinInput = {
    device_identifier:
      props.body?.device_identifier ?? RandomGenerator.alphaNumeric(32),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppGuest.IJoin;
  return await api.functional.todoApp.auth.guest.join.joinGuest(connection, {
    body: joinInput,
  });
}
