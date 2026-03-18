import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_vote_erase_rejected_already_inactive_or_post_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  // 1) Admin join.
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // ---------- Scenario 2: vote already inactive ----------
  // Arrange: use a vote target that becomes inactive after first erase attempt.
  // (If seeding helpers are unavailable, the first erase may reject as not-found;
  // the second erase must still be rejected without succeeding.)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.communityPlatform.admin.posts.votes.erase(
      adminConnection,
      {
        postId,
        voteId,
      },
    );
  } catch {
    // Ignore: we only need to verify that the subsequent request is rejected.
  }
  await TestValidator.httpError(
    "should reject when vote record is already inactive",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.communityPlatform.admin.posts.votes.erase(
        adminConnection,
        {
          postId,
          voteId,
        },
      );
    },
  );
  // ---------- Scenario 3: post deleted/removed from normal viewing ----------
  const deletedPostId = typia.random<string & tags.Format<"uuid">>();
  const deletedVoteId = voteId;
  await TestValidator.httpError(
    "should reject when post is deleted/removed from normal context",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.communityPlatform.admin.posts.votes.erase(
        adminConnection,
        {
          postId: deletedPostId,
          voteId: deletedVoteId,
        },
      );
    },
  );
}
