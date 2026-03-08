import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: IRedditLikeGuest.IJoin;
  },
): Promise<IRedditLikeGuest.IAuthorized> {
  const joinInput = {
    device_id:
      props.body.device_id ?? typia.random<string & tags.Format<"uuid">>(),
    href: props.body.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body.ip ?? typia.random<string & tags.Format<"ipv4">>() ?? null,
    user_agent: props.body.user_agent ?? RandomGenerator.name(1),
  } satisfies IRedditLikeGuest.IJoin;
  return await api.functional.redditLike.auth.guest.join(connection, {
    body: joinInput,
  });
}
