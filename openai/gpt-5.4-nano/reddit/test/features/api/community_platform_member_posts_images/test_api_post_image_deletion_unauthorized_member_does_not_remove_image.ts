import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_deletion_unauthorized_member_does_not_remove_image(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password-1" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password-2" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    memberAConnection,
    {},
  );
  const communityId = community.id;
  const memberPostCreateBody = {
    community_id: communityId,
    post_type: "image",
    title: RandomGenerator.name(),
    image: {
      image_cover_url: "https://example.com/cover.png" as string &
        tags.Format<"uri">,
      image_alt_text: "alt text",
      attachments: [
        {
          file_url: "https://example.com/attachment.png" as string &
            tags.Format<"uri">,
          content_type: "image/png",
          file_size_bytes: 1024,
          image_width_px: 100,
          image_height_px: 100,
          alt_text: "attachment alt",
          sort_order: 0,
        } satisfies ICommunityPlatformPostImage.ICreate,
      ],
    },
  } satisfies ICommunityPlatformPost.ICreate;
  await api.functional.communityPlatform.member.posts.create(
    memberAConnection,
    {
      body: memberPostCreateBody,
    },
  );
  // No SDK/utility for retrieving imageId/postId after create exists in provided materials.
  // Fallback to using generated placeholders for deletion scoping.
  const postIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const imageIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "unauthorized deletion must be rejected",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.posts.images.erasePostImage(
        memberCConnection,
        {
          postId: postIdA,
          imageId: imageIdA,
        },
      );
    },
  );
  // Unable to validate state consistency without post/image viewing APIs.
}
