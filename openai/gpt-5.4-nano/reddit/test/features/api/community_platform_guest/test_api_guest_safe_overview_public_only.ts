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

export async function test_api_guest_safe_overview_public_only(
  connection: api.IConnection,
): Promise<void> {
  // Unauthenticated context (no Authorization header)
  const unauthConnection: api.IConnection = { host: connection.host };
  // Call multiple times and validate guest-safe/public payload
  const calls = await ArrayUtil.asyncRepeat(
    3,
    async () =>
      await api.functional.communityPlatform.guest.guests.at(unauthConnection),
  );
  // Validate each response matches ICommunityPlatformGuest shape
  calls.forEach((output) => typia.assert(output));
  const call1 = calls[0];
  const call2 = calls[1];
  // Ensure stable semantics: returned values are public guest identity/timing only
  // (ICommunityPlatformGuest has no member-only fields by type definition)
  TestValidator.predicate(
    "guest id exists",
    call1.id.length > 0 && call2.id.length > 0,
  );
  TestValidator.predicate(
    "guest device_fingerprint exists",
    call1.device_fingerprint.length > 0 && call2.device_fingerprint.length > 0,
  );
  TestValidator.predicate(
    "timestamps are non-empty",
    call1.created_at.length > 0 &&
      call1.updated_at.length > 0 &&
      (call1.deleted_at === null || call1.deleted_at.length > 0),
  );
}
