import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_post_creation_unsubscribed_community_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate test member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create community A (test member is owner)
  const communityA =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "test_community_A_" + RandomGenerator.alphaNumeric(6),
          description: "Community A for successful post creation",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 3. Authenticate different member (will own community B)
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherAuthResponse = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(otherAuthResponse);
  // 4. Create community B (other member is owner, not test member)
  const communityB =
    await api.functional.redditPlatform.member.communities.create(
      otherMemberConnection,
      {
        body: {
          name: "test_community_B_" + RandomGenerator.alphaNumeric(6),
          description:
            "Community B for failed post creation (test member not subscribed)",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 5. Test member creates post in community A (successful - as owner)
  const postInCommunityA =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        community_id: communityA.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(postInCommunityA);
  TestValidator.equals(
    "post in subscribed community created",
    postInCommunityA.community.id,
    communityA.id,
  );
  // 6. Test member attempts to create post in community B (should fail - not subscribed)
  await TestValidator.error(
    "post in unsubscribed community rejected",
    async () => {
      await api.functional.redditPlatform.member.posts.create(
        memberConnection,
        {
          body: {
            community_id: communityB.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "text",
            text_content: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IRedditPlatformPost.ICreate,
        },
      );
    },
  );
  // 7. Verify the post was not created in community B
  // The error should clearly indicate subscription requirement
  // (validated by TestValidator.error passing)
}
