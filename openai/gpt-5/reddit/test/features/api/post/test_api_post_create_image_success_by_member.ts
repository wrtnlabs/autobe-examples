import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Create an IMAGE post providing image_url only as content.
 *
 * Flow:
 *
 * 1. Register a member (join) to obtain authenticated context.
 * 2. Create a community as the member.
 * 3. Create an IMAGE type post in that community with only image_url populated.
 *
 * Validations:
 *
 * - Response types conform (via typia.assert).
 * - Post has correct community and author references.
 * - Post type is "IMAGE" and only image_url is populated (body/link_url nullish).
 * - Title echoes the input title.
 */
export async function test_api_post_create_image_success_by_member(
  connection: api.IConnection,
) {
  // 1) Member registration (join)
  const member = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "Abcd1234",
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      marketing_opt_in: false,
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(member);

  // 2) Create a community
  const communityCreate = {
    name: `comm_${RandomGenerator.alphaNumeric(8)}`,
    visibility: "public" as IECommunityVisibility,
    nsfw: false,
    auto_archive_days: 30,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // 3) Create IMAGE post within the community
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    type: "IMAGE",
    image_url: imageUrl,
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate.IIMAGE;

  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);

  // Business validations
  TestValidator.equals(
    "post belongs to the created community",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "post authored by the joined member",
    post.community_platform_user_id,
    member.id,
  );
  TestValidator.equals("post type is IMAGE", post.type, "IMAGE");
  TestValidator.equals("post title echoes input", post.title, postBody.title);

  // Only image_url populated for IMAGE; body/link_url must be nullish
  typia.assert<string & tags.Format<"uri">>(post.image_url!);
  TestValidator.predicate(
    "TEXT body should be nullish for IMAGE post",
    post.body === null || post.body === undefined,
  );
  TestValidator.predicate(
    "LINK URL should be nullish for IMAGE post",
    post.link_url === null || post.link_url === undefined,
  );
}
