import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: IRedditCloneGuest.IJoin;
  },
): Promise<IRedditCloneGuest.IAuthorized> {
  const joinInput = {
    session_token:
      props.body.session_token ?? typia.random<string & tags.Format<"uuid">>(),
    device_id:
      props.body.device_id ?? typia.random<string & tags.Format<"uuid">>(),
    ip: props.body.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    referrer: props.body.referrer ?? null,
  } satisfies IRedditCloneGuest.IJoin;
  return await api.functional.redditClone.auth.guest.join(connection, {
    body: joinInput,
  });
}
