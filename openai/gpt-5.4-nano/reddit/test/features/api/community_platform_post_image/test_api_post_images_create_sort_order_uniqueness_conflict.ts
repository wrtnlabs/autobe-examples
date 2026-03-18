import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_member_posts_images_create } from "../../../generate/generate_random_community_platform_member_posts_images_create";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_images_create_sort_order_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up a new authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Prepare a member-owned image postId
  // NOTE: No post-creation API/utility is available in provided inputs.
  // This test still targets sort_order uniqueness behavior for the provided postId.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const sortOrder1 = 1 satisfies number & tags.Type<"int32"> as number &
    tags.Type<"int32">;
  const sortOrder2 = 2 satisfies number & tags.Type<"int32"> as number &
    tags.Type<"int32">;
  const attachmentPayload1 = {
    file_url: `uri:${RandomGenerator.alphabets(10)}` satisfies string &
      tags.Format<"uri">,
    content_type: "image/png",
    file_size_bytes: 1234 satisfies number & tags.Type<"int32">,
    image_width_px: 100 satisfies number & tags.Type<"int32">,
    image_height_px: 200 satisfies number & tags.Type<"int32">,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    sort_order: sortOrder1,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const attachment1 =
    await generate_random_community_platform_member_posts_images_create(
      memberConnection,
      {
        params: { postId },
        body: attachmentPayload1,
      },
    );
  typia.assert(attachment1);
  const attachmentPayload2 = {
    file_url: `uri:${RandomGenerator.alphabets(10)}` satisfies string &
      tags.Format<"uri">,
    content_type: "image/jpeg",
    file_size_bytes: 2345 satisfies number & tags.Type<"int32">,
    image_width_px: 111 satisfies number & tags.Type<"int32">,
    image_height_px: 222 satisfies number & tags.Type<"int32">,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    sort_order: sortOrder2,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const attachment2 =
    await generate_random_community_platform_member_posts_images_create(
      memberConnection,
      {
        params: { postId },
        body: attachmentPayload2,
      },
    );
  typia.assert(attachment2);
  // 4) Validate both calls succeed
  TestValidator.notEquals(
    "attachment IDs should be distinct",
    attachment1.id,
    attachment2.id,
  );
  TestValidator.equals(
    "attachment1 sortOrder matches request",
    attachment1.sortOrder,
    sortOrder1,
  );
  TestValidator.equals(
    "attachment2 sortOrder matches request",
    attachment2.sortOrder,
    sortOrder2,
  );
  TestValidator.equals(
    "attachment1 communityPlatformPostId matches",
    attachment1.communityPlatformPostId,
    postId,
  );
  TestValidator.equals(
    "attachment2 communityPlatformPostId matches",
    attachment2.communityPlatformPostId,
    postId,
  );
  TestValidator.equals(
    "attachment1 deletedAt is null",
    attachment1.deletedAt,
    null,
  );
  TestValidator.equals(
    "attachment2 deletedAt is null",
    attachment2.deletedAt,
    null,
  );
  // 5-6) Conflict attempt: reuse sort_order1 for the same post
  const conflictBody = {
    file_url: `uri:${RandomGenerator.alphabets(10)}` satisfies string &
      tags.Format<"uri">,
    content_type: "image/png",
    file_size_bytes: 3456 satisfies number & tags.Type<"int32">,
    image_width_px: 123 satisfies number & tags.Type<"int32">,
    image_height_px: 456 satisfies number & tags.Type<"int32">,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    sort_order: sortOrder1,
  } satisfies ICommunityPlatformPostImage.ICreate;
  await TestValidator.error(
    "should reject creating duplicate sort_order for same post",
    async () => {
      const result =
        await generate_random_community_platform_member_posts_images_create(
          memberConnection,
          {
            params: { postId },
            body: conflictBody,
          },
        );
      typia.assert(result);
    },
  );
  // Without a read/list API in provided inputs, we can only assert that the
  // originally returned attachments remain consistent with their creation.
  TestValidator.equals(
    "attachment1 sortOrder remains unchanged",
    attachment1.sortOrder,
    sortOrder1,
  );
  TestValidator.equals(
    "attachment2 sortOrder remains unchanged",
    attachment2.sortOrder,
    sortOrder2,
  );
}
