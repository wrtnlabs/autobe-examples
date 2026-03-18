import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_overview_read_idempotent_no_side_effects(
  connection: api.IConnection,
): Promise<void> {
  const unauthConnection: api.IConnection = { host: connection.host };
  const first: ICommunityPlatformGuest =
    await api.functional.communityPlatform.guest.guests.at(unauthConnection);
  typia.assert(first);
  typia.assertEquals<ICommunityPlatformGuest>(first);
  const second: ICommunityPlatformGuest =
    await api.functional.communityPlatform.guest.guests.at(unauthConnection);
  typia.assert(second);
  typia.assertEquals<ICommunityPlatformGuest>(second);
  // Idempotent semantics & no side-effects attributable to GET
  TestValidator.equals(
    "guest overview should be idempotent (same fields/data)",
    first,
    second,
  );
  // Authenticate as a guest; the overview must still be guest-safe
  const guestDeviceFingerprint = typia.random<string>();
  const joinPayload = {
    device_fingerprint: guestDeviceFingerprint,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(authConnection, {
    body: joinPayload,
  });
  const third: ICommunityPlatformGuest =
    await api.functional.communityPlatform.guest.guests.at(authConnection);
  typia.assert(third);
  typia.assertEquals<ICommunityPlatformGuest>(third);
  TestValidator.equals(
    "guest overview after auth must expose only ICommunityPlatformGuest fields (keyset)",
    Object.keys(first).sort(),
    Object.keys(third).sort(),
  );
}
