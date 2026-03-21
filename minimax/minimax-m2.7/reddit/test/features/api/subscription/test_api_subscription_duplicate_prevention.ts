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

export async function test_api_subscription_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: `testuser_${typia.random<string>().substring(0, 8)}`,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      },
    },
  );
  typia.assert(authorized);
  // 2. Create a new community
  const community = await api.functional.redditClone.member.communities.create(
    memberConnection,
    {
      body: {
        name: `test_community_${typia.random<string>().substring(0, 8)}`,
        description: "Test community for duplicate subscription prevention",
      },
    },
  );
  typia.assert(community);
  // 3. First subscription - expect success (201)
  const firstSubscription =
    await api.functional.redditClone.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditClonePostTextContent.ICreate,
      },
    );
  typia.assert(firstSubscription);
  TestValidator.equals(
    "first subscription member matches",
    firstSubscription.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "first subscription community matches",
    firstSubscription.community.id,
    community.id,
  );
  // 4. Second subscription - expect 409 Conflict
  await TestValidator.error("duplicate subscription should fail", async () => {
    await api.functional.redditClone.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditClonePostTextContent.ICreate,
      },
    );
  });
}
