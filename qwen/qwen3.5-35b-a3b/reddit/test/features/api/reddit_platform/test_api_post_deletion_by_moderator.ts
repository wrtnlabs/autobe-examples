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

export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (moderator) and authenticate
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(firstConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.alphaNumeric(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(firstMember);
  // 2. Create a community as the first member (moderator)
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      firstConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member (post author) and authenticate
  const secondConnection: api.IConnection = { host: connection.host };
  const secondMember: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(secondConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.alphaNumeric(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(secondMember);
  // 4. Create a post in the community as the second member
  const post: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(secondConnection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 10,
        }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 15,
        }),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(post);
  // 5. Verify the second member is NOT the post author
  TestValidator.notEquals(
    "second member differs from post author",
    secondMember.id,
    post.author.id,
  );
  // 6. Delete the post using the first member's moderator session
  await api.functional.redditPlatform.member.posts.erase(firstConnection, {
    postId: post.id,
  });
  // 7. Verify deletion by attempting to delete again (should return 404)
  await TestValidator.error(
    "post deleted - second delete returns 404",
    async () => {
      await api.functional.redditPlatform.member.posts.erase(firstConnection, {
        postId: post.id,
      });
    },
  );
}
