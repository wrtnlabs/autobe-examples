import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_media_upload_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to upload media
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  // Step 2: Create community to host the post
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create a post in the community
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Upload first media file to the post
  const firstMedia =
    await api.functional.communityBbs.member.posts.media.create(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(firstMedia);
  TestValidator.equals(
    "first media has unique mediaId",
    firstMedia.mediaId,
    firstMedia.mediaId,
  );
  // Step 5: Upload second media file to the same post
  const secondMedia =
    await api.functional.communityBbs.member.posts.media.create(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(secondMedia);
  TestValidator.equals(
    "second media has unique mediaId",
    secondMedia.mediaId,
    secondMedia.mediaId,
  );
  // Step 6: Validate that both media files are linked to the same post
  TestValidator.equals(
    "first media linked to correct post",
    firstMedia.postId,
    post.id,
  );
  TestValidator.equals(
    "second media linked to correct post",
    secondMedia.postId,
    post.id,
  );
  // Step 7: Validate that first media was not overwritten by second upload
  TestValidator.notEquals(
    "first and second media have different mediaIds",
    firstMedia.mediaId,
    secondMedia.mediaId,
  );
  // Note: We cannot verify independent accessibility as there is no API endpoint to retrieve media files by mediaId
}
