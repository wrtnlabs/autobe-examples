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
    body?: DeepPartial<IRedditCloneGuest.IJoin>;
  },
): Promise<IRedditCloneGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    ip_address:
      props.body?.ip_address ?? typia.random<string & tags.Format<"ipv4">>(),
    user_agent:
      props.body?.user_agent ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneGuest.IJoin;
  return await api.functional.redditClone.auth.guest.join(connection, {
    body: joinInput,
  });
}
