import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that guest accounts can browse public platform content.
 *
 * Verifies that guests have proper read-only access to browse
 * communities and posts through public feeds.
 */
export async function test_api_guest_browse_capability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/browse",
      referrer: "https://google.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Browse communities as guest
  const communities = await api.functional.communityPlatform.communities.index(
    guestConnection,
    {
      body: {
        sort: "popular",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(communities);
  // 3. Access Popular Feed as guest
  const posts = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(posts);
  // 4. Validate posts have business content
  if (posts.data.length > 0) {
    const firstPost = posts.data[0];
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.predicate("post has author", firstPost.author !== null);
    TestValidator.predicate("post has community", firstPost.community !== null);
  }
  // 5. Validate communities have business content
  if (communities.data.length > 0) {
    const firstCommunity = communities.data[0];
    TestValidator.predicate(
      "community has name",
      firstCommunity.name.length > 0,
    );
    TestValidator.predicate(
      "community has description",
      firstCommunity.description.length > 0,
    );
    TestValidator.predicate(
      "community has subscriber count",
      firstCommunity.subscriber_count >= 0,
    );
  }
}
