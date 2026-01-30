import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_identity_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the guest actor
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Use the mandatory utility function to create guest identity (not SDK function)
  const guest: ICommunityBbsGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {} satisfies ICommunityBbsGuest.IJoin,
    },
  );
  // Step 3: Validate the response structure using typia.assert() - handles ALL validation
  typia.assert(guest);
  // Step 4: Validate that token property exists and is not null
  // This is the only validation needed beyond typia.assert()
  TestValidator.predicate("token exists and is not null", guest.token !== null);
}
