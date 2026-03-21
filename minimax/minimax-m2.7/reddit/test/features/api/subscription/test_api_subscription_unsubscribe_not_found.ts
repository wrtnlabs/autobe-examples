import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_subscription_unsubscribe_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test unsubscription for non-existent subscription
  // 1. Authenticate as member
  // 2. Create community and subscribe
  // 3. Delete subscription (first succeeds with 204)
  // 4. Attempt to delete same subscription again (returns 404)
  // 5. Attempt to delete random UUID (returns 404)
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. First deletion should succeed (204)
  await api.functional.redditClone.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  // 5. Second deletion of same subscription should return 404
  await TestValidator.httpError(
    "second deletion of same subscription returns 404",
    404,
    async () =>
      await api.functional.redditClone.member.subscriptions.erase(
        memberConnection,
        {
          subscriptionId: subscription.id,
        },
      ),
  );
  // 6. Deletion of random UUID should return 404
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deletion of random UUID returns 404",
    404,
    async () =>
      await api.functional.redditClone.member.subscriptions.erase(
        memberConnection,
        {
          subscriptionId: randomUuid,
        },
      ),
  );
}
