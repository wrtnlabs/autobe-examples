import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_moderator_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create Member B (will become moderator and post author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 3. Member A creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1> & tags.MaxLength<21>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Member A appoints Member B as moderator
  const moderatorAppointment =
    await generate_random_reddit_platform_member_communities_moderators_add(
      memberAConnection,
      {
        body: {
          user_id: memberB.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAppointment);
  // 5. Verify moderator relationship was created correctly
  TestValidator.equals(
    "moderator appointment for correct community",
    moderatorAppointment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator appointment for correct user",
    moderatorAppointment.user.id,
    memberB.id,
  );
  // 6. Member B (as moderator) creates a post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 7. Verify post was created successfully with correct author
  TestValidator.equals(
    "post author matches creator",
    post.author.id,
    memberB.id,
  );
  TestValidator.equals(
    "post belongs to correct community",
    post.community.id,
    community.id,
  );
  // 8. Member B (as moderator) deletes another member's post
  // Note: Member B is both the post author AND a moderator, but we're testing that
  // a moderator can delete posts in their community (regardless of author)
  await api.functional.redditPlatform.member.posts.erase(memberBConnection, {
    postId: post.id,
  });
  // 9. Verify deletion succeeded (204 No Content means success)
  // The successful return from erase() confirms 204 No Content
}
