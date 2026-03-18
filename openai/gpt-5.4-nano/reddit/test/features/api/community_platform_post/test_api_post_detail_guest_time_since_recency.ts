import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_detail_guest_time_since_recency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest authorization
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = `fp_${RandomGenerator.alphabets(16)}_${Date.now()}`;
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: `https://${RandomGenerator.alphabets(10)}.example.com/${RandomGenerator.alphabets(8)}` satisfies string &
        tags.Format<"uri">,
      referrer:
        `https://referrer.${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}` satisfies string &
          tags.Format<"uri">,
    },
  });
  typia.assert(guestAuth);
  // 2) Guest post detail
  const postId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.guest.posts.at(
    guestConnection,
    { postId },
  );
  typia.assert(post);
  // 3) Validate timeSince
  TestValidator.predicate(
    "timeSince is non-empty",
    post.timeSince.trim().length > 0,
  );
  // The formatter is implementation-dependent; keep the check permissive.
  TestValidator.predicate(
    "timeSince looks human-readable",
    /(ago|just now|min|hour|day|week|month|year|전|분 전|시간 전|일 전)/i.test(
      post.timeSince,
    ),
  );
  // 4) Validate other important fields
  TestValidator.predicate("title is non-empty", post.title.trim().length > 0);
  TestValidator.predicate(
    "voteScore is an integer",
    Number.isInteger(post.voteScore),
  );
  TestValidator.predicate(
    "commentsCount is an integer",
    Number.isInteger(post.commentsCount),
  );
}
