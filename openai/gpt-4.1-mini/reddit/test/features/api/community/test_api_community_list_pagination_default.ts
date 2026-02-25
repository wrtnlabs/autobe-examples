import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_list_pagination_default(
  connection: api.IConnection,
) {
  // 1. Guest join to get authorization for 'guest' actor
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {});
  guestConnection.headers = { Authorization: guestAuth.token.access };
  // 2. Retrieve paginated list of communities with default parameters (empty request)
  const output = await api.functional.communityPlatform.guest.communities.index(
    guestConnection,
    {
      body: {},
    },
  );
  // 3. Assert output type validation
  typia.assert(output);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", output.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    output.pagination.pages >= 0,
  );
  // 5. Validate each community summary
  for (const community of output.data) {
    typia.assert(community);
    // Validate community fields
    TestValidator.predicate(
      "community id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );
    TestValidator.predicate(
      "community name is non-empty",
      community.name.length > 0,
    );
    TestValidator.predicate(
      "community description is string",
      typeof community.description === "string",
    );
    TestValidator.predicate(
      "community iconUrl is string",
      typeof community.iconUrl === "string",
    );
    TestValidator.predicate(
      "community subscriberCount is non-negative",
      community.subscriberCount >= 0,
    );
    // Validate ownerUser summary
    typia.assert(community.ownerUser);
    TestValidator.predicate(
      "ownerUser id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.ownerUser.id,
      ),
    );
    TestValidator.predicate(
      "ownerUser email is non-empty",
      community.ownerUser.email.length > 0,
    );
    TestValidator.predicate(
      "ownerUser username is non-empty",
      community.ownerUser.username.length > 0,
    );
    TestValidator.predicate(
      "ownerUser displayName is non-empty",
      community.ownerUser.displayName.length > 0,
    );
    TestValidator.predicate(
      "ownerUser karma is integer",
      Number.isInteger(community.ownerUser.karma),
    );
  }
  // Handle case where data array might be empty gracefully
  TestValidator.predicate("data array exists", Array.isArray(output.data));
}
