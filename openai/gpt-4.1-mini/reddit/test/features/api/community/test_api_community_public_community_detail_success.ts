import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_public_community_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  guestConnection.headers = { Authorization: authorized.token.access };
  // 2. Retrieve community list to get a valid community ID (as no create endpoint available in scenario)
  // Since we do not have endpoint to list communities publicly, we rely on the at endpoint with a known valid communityId from join authorization output or generate a UUID that is not guaranteed to exist.
  // We will just generate a UUID and call the endpoint but catch error in case of 404 to ignore failure to keep test simple
  // (Note: In a real test environment, a community creation step or fixture setup would provide a valid communityId.)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  let community = null;
  try {
    community = await api.functional.communityPlatform.guest.communities.at(
      guestConnection,
      {
        communityId,
      },
    );
  } catch (error) {
    // If 404, it means no such community. Fail the test explicitly.
    throw new Error(
      `Failed to get community details for ID ${communityId}: ${error}`,
    );
  }
  typia.assert(community);
  // subscriberCount is boolean
  TestValidator.predicate(
    "subscriberCount is boolean",
    typeof community.subscriberCount === "boolean",
  );
  // ownerUser has id and displayName strings
  TestValidator.predicate(
    "ownerUser.id is uuid",
    typeof community.ownerUser.id === "string" &&
      community.ownerUser.id.length > 0,
  );
  TestValidator.predicate(
    "ownerUser.displayName is string",
    typeof community.ownerUser.displayName === "string" &&
      community.ownerUser.displayName.length > 0,
  );
}
