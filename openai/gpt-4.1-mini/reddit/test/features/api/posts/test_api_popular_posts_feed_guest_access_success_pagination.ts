import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_posts_feed_guest_access_success_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join to obtain authorization token for guest actor
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  // 2. Call popular posts feed endpoint without authentication headers - must work for guests
  const page =
    await api.functional.communityPlatform.guest.posts.feed.popular.index(
      guestConnection,
    );
  typia.assert(page);
  // 3. Validate pagination structure
  TestValidator.predicate("page current >= 1", page.pagination.current >= 1);
  TestValidator.predicate("page limit > 0", page.pagination.limit > 0);
  TestValidator.predicate("page records >= 0", page.pagination.records >= 0);
  TestValidator.predicate("page pages >= 0", page.pagination.pages >= 0);
  // 4. Validate each post summary via typia.assert only (no property extension allowed by schema)
  page.data.forEach((post, index) => {
    typia.assert(post);
  });
  // 5. Guest connection has Authorization header from join
  TestValidator.predicate(
    "guest connection has Authorization header",
    "Authorization" in (guestConnection.headers ?? {}),
  );
}
