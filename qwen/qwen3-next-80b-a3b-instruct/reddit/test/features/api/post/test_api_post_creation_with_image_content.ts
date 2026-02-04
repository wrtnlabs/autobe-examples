import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_owner_communities_create } from "../../../generate/generate_random_community_platform_owner_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_post_creation_with_image_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner connection and authenticate owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  // ownerConnection.headers is now updated internally with token
  // Step 2: Create a community as owner
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_owner_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // memberConnection.headers is now updated internally with token
  // Step 4: Subscribe member to the community
  await api.functional.communityPlatform.member.communities.subscribers.create(
    memberConnection,
    {
      communityCode: community.community_code,
    },
  );
  // Step 5: Create post with image content as member
  const imageExtension: "jpg" | "jpeg" | "png" | "gif" = RandomGenerator.pick([
    "jpg",
    "jpeg",
    "png",
    "gif",
  ] as const);
  const imageFilename: string = `image_${RandomGenerator.alphaNumeric(8)}.${imageExtension}`;
  const imageSize: number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.Maximum<10485760> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<10485760>
  >();
  const imageUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      memberConnection,
      {
        communityName: community.community_code,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          image: {
            filename: imageFilename,
            extension: imageExtension,
            size: imageSize,
            url: imageUrl,
          } satisfies ICommunityPlatformPost.ICreate["image"],
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Step 6: Validate post has correct content_type and metadata
  TestValidator.equals(
    "content type should be image",
    post.content_type,
    "image",
  );
  TestValidator.predicate(
    "title should be within 300 characters",
    post.title.length <= 300,
  );
  TestValidator.predicate(
    "title should be at least 1 character",
    post.title.length >= 1,
  );
  // Fixed: Use the only available property from ISummary (id property doesn't exist in ISummary)
  TestValidator.predicate(
    "post has valid author",
    typeof post.author !== "undefined",
  );
  TestValidator.predicate(
    "post has valid community",
    post.community.name !== undefined,
  );
}
