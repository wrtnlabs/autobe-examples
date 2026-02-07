import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_vote_analytics_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection with proper authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  // Note: The test scenario requires creating a post with votes to test the analytics endpoint properly,
  // but the provided DTOs don't include post creation or vote creation functionality.
  // Since we cannot create posts or votes through available APIs, we'll test the endpoint
  // with a valid UUID format postId and validate the response structure.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Call the analytics endpoint as admin - this tests admin access to any post's analytics
  const analytics =
    await api.functional.redditPlatform.admin.posts.analytics.votes.getAnalytics(
      adminConnection,
      {
        postId: postId,
      },
    );
  // Validate the response structure matches the expected vote analytics type
  typia.assert<IRedditPlatformPostVote>(analytics);
}
