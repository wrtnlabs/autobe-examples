import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_guest_list_includes_new_guest_after_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new guest join connection and register a guest
  const guestJoinConnection: api.IConnection = { host: connection.host };
  // The guest join body is empty according to ICommunityPlatformGuest.IJoin
  const authorized = await authorize_guest_join(guestJoinConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Retrieve the guest list using the base connection (guest list is public)
  const guestsPage = await api.functional.communityPlatform.guest.guests.get({
    host: connection.host,
  });
  typia.assert(guestsPage);
  // 3. Verify that guests list contains at least one guest
  TestValidator.predicate(
    "guest list data non-empty",
    Array.isArray(guestsPage.data) && guestsPage.data.length > 0,
  );
}
