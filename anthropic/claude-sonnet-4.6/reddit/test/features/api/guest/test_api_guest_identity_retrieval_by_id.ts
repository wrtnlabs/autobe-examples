import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_identity_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new guest identity using the utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const fingerprint = RandomGenerator.alphaNumeric(32);
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Retrieve the guest identity by UUID using a plain (unauthenticated) connection
  const publicConnection: api.IConnection = { host: connection.host };
  const guest = await api.functional.community.guests.at(publicConnection, {
    guestId: authorized.id,
  });
  typia.assert(guest);
  // Step 4: Assert returned id matches the guestId used in the request
  TestValidator.equals("guest id matches", guest.id, authorized.id);
  // Step 5: Assert fingerprint matches what was submitted during join
  TestValidator.equals("fingerprint matches", guest.fingerprint, fingerprint);
  // Step 6: Assert temporal consistency: updated_at >= created_at
  TestValidator.predicate(
    "updated_at is equal to or after created_at",
    new Date(guest.updated_at).getTime() >=
      new Date(guest.created_at).getTime(),
  );
}
