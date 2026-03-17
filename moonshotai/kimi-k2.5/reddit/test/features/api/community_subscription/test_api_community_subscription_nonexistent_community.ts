import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_subscription_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  /**
   * A member attempts to subscribe to a community that does not exist.
   * The system validates that the communityId references an existing,
   * non-deleted community and returns 404 Not Found when it doesn't.
   */
  // Create a member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Generate a random UUID that doesn't exist as a community
  const nonexistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Attempting to subscribe should throw a 404 HTTP error
  await TestValidator.httpError(
    "subscription to non-existent community returns 404",
    404,
    async () => {
      await api.functional.redditLike.member.communities.subscriptions.create(
        memberConnection,
        {
          communityId: nonexistentCommunityId,
        },
      );
    },
  );
}
