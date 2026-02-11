import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_posts_create } from "../../../generate/generate_random_reddit_platform_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_creation_text_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberProfile);
  // 2. Create and subscribe to a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create TEXT post using utility function
  const textPost = await generate_random_reddit_platform_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(3),
        type: "TEXT",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  // 5. Validate post properties
  TestValidator.equals(
    "community matches",
    textPost.community.id,
    community.id,
  );
  TestValidator.equals("author matches", textPost.author.id, memberProfile.id);
  TestValidator.equals("type is TEXT", textPost.type, "TEXT");
  TestValidator.equals("vote score is 0", textPost.voteScore, 0);
  TestValidator.equals("comment count is 0", textPost.commentCount, 0);
  TestValidator.predicate("has valid title", textPost.title.length > 0);
  TestValidator.predicate(
    "has content",
    typeof textPost.content === "string" && textPost.content.length > 0,
  );
}
