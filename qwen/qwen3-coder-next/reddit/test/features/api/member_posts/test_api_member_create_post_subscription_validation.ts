import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test community subscription validation for post creation.
 * 1. Create authenticated member session
 * 2. Test invalid community ID format rejection
 * 3. Test TEXT post requires content field
 * 4. Test LINK post requires url field
 * 5. Test IMAGE post requires imageUrl field
 * 6. Test unsubscribed community post rejection
 * 7. Test banned community post rejection
 */
export async function test_api_member_create_post_subscription_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Test invalid community ID format (should fail)
  await TestValidator.error(
    "invalid community ID format should fail",
    async () => {
      await api.functional.redditPlatform.member.posts.create(
        memberConnection,
        {
          body: {
            communityId: "invalid-uuid-format" as any,
            title: RandomGenerator.name(3),
            type: "TEXT" as const,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditPlatformPost.ICreate,
        },
      );
    },
  );
  // 3. Test TEXT post requires content (should fail if content is missing)
  await TestValidator.error("TEXT post requires content", async () => {
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        communityId: "00000000-0000-0000-0000-000000000000" as any,
        title: RandomGenerator.name(3),
        type: "TEXT" as const,
        content: undefined,
      } satisfies IRedditPlatformPost.ICreate,
    });
  });
  // 4. Test LINK post requires url (should fail if url is missing)
  await TestValidator.error("LINK post requires url", async () => {
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        communityId: "00000000-0000-0000-0000-000000000000" as any,
        title: RandomGenerator.name(3),
        type: "LINK" as const,
        url: undefined,
      } satisfies IRedditPlatformPost.ICreate,
    });
  });
  // 5. Test IMAGE post requires imageUrl (should fail if imageUrl is missing)
  await TestValidator.error("IMAGE post requires imageUrl", async () => {
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        communityId: "00000000-0000-0000-0000-000000000000" as any,
        title: RandomGenerator.name(3),
        type: "IMAGE" as const,
        imageUrl: undefined,
      } satisfies IRedditPlatformPost.ICreate,
    });
  });
  // 6. Test unsubscribed community access (use valid UUID but non-existent community)
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  await TestValidator.error(
    "cannot post to non-existent community",
    async () => {
      await api.functional.redditPlatform.member.posts.create(
        memberConnection,
        {
          body: {
            communityId: validUuid,
            title: RandomGenerator.name(3),
            type: "TEXT" as const,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditPlatformPost.ICreate,
        },
      );
    },
  );
  // 7. Test banned community access (use valid UUID for banned community)
  const bannedUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  await TestValidator.error("cannot post to banned community", async () => {
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        communityId: bannedUuid,
        title: RandomGenerator.name(3),
        type: "TEXT" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    });
  });
}
