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
export async function test_api_media_association_update_by_post_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create community to host the post
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create post to which media will be associated
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.name(5),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 4: Attach media file to the post before updating the association
  const media: ICommunityBbsPostMedia =
    await api.functional.communityBbs.member.posts.media.create(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(media);
  // Step 5: Update media association metadata (as post author)
  const updatedMedia: ICommunityBbsPostMedia =
    await api.functional.communityBbs.member.posts.media.update(
      memberConnection,
      {
        postId: post.id,
        mediaId: media.mediaId,
      },
    );
  typia.assert(updatedMedia);
  // Step 6: Validate that media association was updated and media file unchanged
  TestValidator.equals(
    "mediaId unchanged",
    updatedMedia.mediaId,
    media.mediaId,
  );
  TestValidator.equals("postId unchanged", updatedMedia.postId, media.postId);
  TestValidator.equals("name unchanged", updatedMedia.name, media.name);
  TestValidator.equals("size unchanged", updatedMedia.size, media.size);
  TestValidator.equals("type unchanged", updatedMedia.type, media.type);
  TestValidator.equals("url unchanged", updatedMedia.url, media.url);
  TestValidator.equals(
    "uploadedAt unchanged",
    updatedMedia.uploadedAt,
    media.uploadedAt,
  );
  // Step 7: Test that unauthorized member cannot update the media association
  // Create a second member connection
  const unauthorizedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(unauthorizedMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(unauthorizedMember);
  // Verify that unauthorized member cannot update the media association
  await TestValidator.error(
    "unauthorized member cannot update media association",
    async () => {
      await api.functional.communityBbs.member.posts.media.update(
        unauthorizedMemberConnection,
        {
          postId: post.id,
          mediaId: media.mediaId,
        },
      );
    },
  );
}
