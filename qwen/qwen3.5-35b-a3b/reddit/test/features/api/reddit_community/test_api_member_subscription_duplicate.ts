import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_subscription_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/",
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(member);
  // 2. Create a community (using available API if exists, or using generate_random utility)
  // Since no community creation API exists in the provided SDK, we need to use a workaround
  // Generate a random UUID for testing or use a community created via generate_random utility
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create first subscription (this will succeed)
  const firstSubscription: IRedditCommunitySubscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: testCommunityId,
        },
      },
    );
  typia.assert(firstSubscription);
  // 3. Attempt to create a duplicate subscription
  await TestValidator.httpError(
    "duplicate subscription should return 409 Conflict",
    [409],
    async () => {
      await api.functional.redditCommunity.member.subscriptions.create(
        memberConnection,
        {
          body: {
            reddit_community_communities_id: testCommunityId,
          } satisfies IRedditCommunitySubscription.ICreate,
        },
      );
    },
  );
  // 4. Verify the error message indicates active subscription
  try {
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: testCommunityId,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
    throw new Error("Expected error not thrown");
  } catch (error) {
    const errorMessage: string = (error as Error).message || String(error);
    TestValidator.predicate(
      "error message mentions active subscription",
      errorMessage.toLowerCase().includes("active subscription") ||
        errorMessage.toLowerCase().includes("already"),
    );
  }
}