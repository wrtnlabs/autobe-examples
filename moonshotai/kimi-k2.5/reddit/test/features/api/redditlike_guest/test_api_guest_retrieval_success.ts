import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new guest connection and register to get a valid guest ID
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {} satisfies Partial<IRedditLikeGuest.IJoin>,
  });
  typia.assert(authorized);
  // Retrieve the guest using the obtained guest ID
  const retrievedGuest = await api.functional.redditLike.guests.at(
    guestConnection,
    {
      guestId: authorized.id,
    },
  );
  typia.assert(retrievedGuest);
  // Validate that the retrieved guest matches the created guest
  TestValidator.equals("guest id matches", retrievedGuest.id, authorized.id);
  TestValidator.equals(
    "device fingerprint matches",
    retrievedGuest.deviceFingerprint,
    authorized.deviceFingerprint,
  );
}
