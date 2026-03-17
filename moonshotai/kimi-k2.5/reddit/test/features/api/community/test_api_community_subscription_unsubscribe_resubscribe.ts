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
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_subscription_unsubscribe_resubscribe(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const initialSubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(initialSubscription);
  const initialId = initialSubscription.id;
  // 4. Unsubscribe from the community (soft-delete)
  await api.functional.redditLike.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 5. Resubscribe to the same community
  const resubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(resubscription);
  // 6. Validate that resubscription creates a new record with different ID
  TestValidator.notEquals(
    "resubscription creates new record with different ID",
    initialId,
    resubscription.id,
  );
  // 7. Validate the resubscription is active (not soft-deleted)
  TestValidator.equals(
    "resubscription is active",
    resubscription.deleted_at,
    null,
  );
  // 8. Validate member info matches
  TestValidator.equals(
    "resubscription member matches",
    resubscription.member.id,
    authorized.id,
  );
  // 9. Validate community info matches
  TestValidator.equals(
    "resubscription community matches",
    resubscription.community.id,
    community.id,
  );
}
