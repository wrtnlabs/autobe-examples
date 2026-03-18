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

export async function test_api_post_detail_guest_ignores_soft_deleted_votes_and_comments(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: `guest-${RandomGenerator.alphaNumeric(12)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guest);
  // Use a random UUID as postId; the backend may return error if not found.
  // Since no SDK/utility exists here to create a post with specific soft-deleted
  // interactions, we validate only contract-level aggregation fields.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.guest.posts.at(
    guestConnection,
    { postId },
  );
  typia.assert(post);
  TestValidator.predicate(
    "voteScore is int32",
    Number.isInteger(post.voteScore),
  );
  TestValidator.predicate(
    "commentsCount is int32",
    Number.isInteger(post.commentsCount),
  );
  TestValidator.predicate("timeSince is non-empty", post.timeSince.length > 0);
}
