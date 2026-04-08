import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_browse_communities_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest account setup (required prerequisite per dependency)
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestConnection.headers);
  // 2. Browse communities (empty result set test)
  const result =
    await api.functional.redditCommunity.guest.browse_communities.browse(
      guestConnection,
    );
  typia.assert(result);
  // 3. Validate pagination metadata for empty result
  TestValidator.equals("pagination current is 1", result.pagination.current, 1);
  TestValidator.equals("pagination limit is 20", result.pagination.limit, 20);
  TestValidator.equals("pagination records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", result.pagination.pages, 0);
  // 4. Validate empty data array
  TestValidator.equals("data array is empty", result.data, []);
}
