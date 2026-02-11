import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that unauthenticated users cannot access community analytics endpoint.
 * This test calls the analytics endpoint without any authentication token
 * and verifies that the server properly rejects the request with 401 status.
 */
export async function test_api_community_analytics_unauthenticated_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for communityId
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  // Directly call the analytics endpoint without authentication
  // This should result in a 401 Unauthorized error
  await TestValidator.httpError(
    "unauthenticated access to community analytics should be rejected with 401",
    401,
    async () =>
      await api.functional.redditPlatform.member.communities.analytics.at(
        connection,
        {
          communityId,
        },
      ),
  );
}
