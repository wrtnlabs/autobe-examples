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

export async function test_api_media_association_update_multiple_files(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to create content
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
  // Step 2: Create a community to host the post
  const community: ICommunityBbsCommunity =
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
  // Step 3: Create a post to which media will be associated
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph(),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 4: Attach first media file to the post
  const firstMedia: ICommunityBbsPostMedia =
    await api.functional.communityBbs.member.posts.media.create(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(firstMedia);
  // Step 5: Attach second media file to the post
  const secondMedia: ICommunityBbsPostMedia =
    await api.functional.communityBbs.member.posts.media.create(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(secondMedia);
  // Step 6: Update first media association (modify metadata)
  const updatedFirstMedia: ICommunityBbsPostMedia =
    await api.functional.communityBbs.member.posts.media.update(
      memberConnection,
      {
        postId: post.id,
        mediaId: firstMedia.mediaId,
      },
    );
  typia.assert(updatedFirstMedia);
  TestValidator.equals(
    "first media updated",
    updatedFirstMedia.mediaId,
    firstMedia.mediaId,
  );
  // Step 7: Update second media association (modify metadata)
  const updatedSecondMedia: ICommunityBbsPostMedia =
    await api.functional.communityBbs.member.posts.media.update(
      memberConnection,
      {
        postId: post.id,
        mediaId: secondMedia.mediaId,
      },
    );
  typia.assert(updatedSecondMedia);
  TestValidator.equals(
    "second media updated",
    updatedSecondMedia.mediaId,
    secondMedia.mediaId,
  );
  // Step 8: Verify both media associations still exist and are correctly updated
  const allMedia: ICommunityBbsPostMedia[] = await typia.assert<
    ICommunityBbsPostMedia[]
  >(
    (api.functional.communityBbs.member.posts.media as any).index(
      memberConnection,
      {
        postId: post.id,
      },
    ),
  );
  typia.assert(allMedia);
  TestValidator.predicate("both media files present", allMedia.length === 2);
  TestValidator.predicate(
    "first media in list",
    allMedia.some((m: ICommunityBbsPostMedia) => m.mediaId === firstMedia.mediaId),
  );
  TestValidator.predicate(
    "second media in list",
    allMedia.some((m: ICommunityBbsPostMedia) => m.mediaId === secondMedia.mediaId),
  );
}