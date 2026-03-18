import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: ICommunityPlatformGuest.IJoin;
  },
): Promise<ICommunityPlatformGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint: props.body.device_fingerprint,
    ip: props.body.ip,
    href: props.body.href,
    referrer: props.body.referrer,
  } satisfies ICommunityPlatformGuest.IJoin;
  return await api.functional.communityPlatform.auth.guest.join.joinGuest(
    connection,
    {
      body: joinInput,
    },
  );
}
