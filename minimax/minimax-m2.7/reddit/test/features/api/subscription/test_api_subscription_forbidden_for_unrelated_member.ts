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

/**
 * Test that an unrelated member cannot retrieve another user's subscription.
 *
 * Scenario:
 * 1. Register member A and create a community
 * 2. Member A subscribes to the community
 * 3. Register member B (unrelated third party)
 * 4. Member B calls GET /redditClone/member/subscriptions/{subscriptionId} using member A's subscription ID
 *
 * Expected: Returns 403 Forbidden because member B is neither the subscriber
 * nor a moderator/owner of the community.
 */
export async function test_api_subscription_forbidden_for_unrelated_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {},
  });
  // Step 2: Member A creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {},
      },
    );
  // Step 3: Member A subscribes to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditClonePostTextContent.ICreate,
      },
    );
  // Step 4: Register member B (unrelated third party)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {},
  });
  // Step 5: Member B tries to access member A's subscription (should fail with 403)
  await TestValidator.httpError(
    "unrelated member cannot access another user's subscription",
    403,
    async () =>
      await api.functional.redditClone.member.subscriptions.at(
        memberBConnection,
        {
          subscriptionId: subscription.id,
        },
      ),
  );
}
