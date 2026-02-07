import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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

export async function test_api_popular_feed_content_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest account setup
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {} satisfies ICommunityPlatformGuest.IJoin,
  });
  // 2. Fetch popular feed
  const feed =
    await api.functional.communityPlatform.guest.feed.popular.index(
      guestConnection,
    );
  typia.assert(feed);
  // 3. Validate content display across different post types
  for (const post of feed.data) {
    if (post.content_type === "text") {
      // Text posts show 200-character title preview
      TestValidator.predicate(
        "text post title < 200 characters",
        post.title.length <= 200,
      );
    } else if (post.content_type === "link") {
      // Link posts display domain name (e.g., youtube.com)
      const domain = post.title.split("://")[1]?.split("/")[0];
      TestValidator.predicate("link post has domain", !!domain);
    } else if (post.content_type === "image") {
      // Image posts show thumbnail URL in title
      TestValidator.predicate(
        "image post has URL",
        post.title.includes("http"),
      );
    }
  }
}
