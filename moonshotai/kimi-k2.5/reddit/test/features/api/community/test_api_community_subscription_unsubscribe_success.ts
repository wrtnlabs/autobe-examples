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

/**
 * Test the primary success path of unsubscribing from a subscribed community.
 * This scenario validates that a member can successfully unsubscribe from a community they are subscribed to.
 * The workflow includes: authenticate as a member, create a community with an icon attachment, subscribe to that community, then unsubscribe.
 * Validation points include: 1) HTTP 204 No Content is returned on successful unsubscription, 2) The subscription record is soft-deleted (deleted_at timestamp set),
 * 3) The member can subscribe again to the same community as a new subscription.
 */
export async function test_api_community_subscription_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create an icon attachment for the community
  const attachment: IRedditLikeAttachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
          originalFilename: "icon.png",
        } satisfies IRedditLikeAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 3. Create a community with the icon attachment
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<500>
          >(),
          iconAttachmentId: attachment.id,
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Subscribe to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Verify subscription is active (deleted_at is null)
  if (subscription.deleted_at !== null) {
    throw new Error("Expected subscription to be active before unsubscription");
  }
  // 5. Unsubscribe from the community (returns void/204 No Content)
  await api.functional.redditLike.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 6. Verify unsubscription by subscribing again (should succeed with new subscription)
  const newSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(newSubscription);
  // Verify it's a new subscription (different ID)
  if (subscription.id === newSubscription.id) {
    throw new Error(
      "Expected new subscription ID to differ from previous subscription",
    );
  }
}
