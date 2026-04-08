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

export async function test_api_post_creation_link_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community for the member to post in
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(5) +
            "_" +
            RandomGenerator.alphaNumeric(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a link post
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const linkUrl = typia.random<string & tags.Format<"uri">>();
  const linkPost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: title,
        post_type: "link" as const,
        url: linkUrl,
      } as IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  // 4. Validate link post response
  TestValidator.equals("post type is link", linkPost.post_type, "link");
  TestValidator.equals("title matches input", linkPost.title, title);
  TestValidator.equals("upvotes initialized to 0", linkPost.upvotes_count, 0);
  TestValidator.equals(
    "downvotes initialized to 0",
    linkPost.downvotes_count,
    0,
  );
  TestValidator.equals(
    "comment count initialized to 0",
    linkPost.comment_count,
    0,
  );
  TestValidator.equals(
    "author matches authenticated member",
    linkPost.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community matches created community",
    linkPost.community.id,
    community.id,
  );
  TestValidator.equals("link post exists", linkPost.linkPost !== null, true);
  TestValidator.equals(
    "link URL matches input",
    linkPost.linkPost?.url,
    linkUrl,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    linkPost.created_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null (active post)",
    linkPost.deleted_at,
    null,
  );
  TestValidator.equals(
    "updated_at is valid timestamp",
    linkPost.updated_at.length > 0,
    true,
  );
}