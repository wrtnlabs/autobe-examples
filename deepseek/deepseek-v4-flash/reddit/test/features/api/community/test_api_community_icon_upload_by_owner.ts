import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_images_create } from "../../../generate/generate_random_community_platform_member_communities_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that the community owner can upload a new icon image for their community.
 *
 * Verifies the complete icon upload flow: member registration, community creation, and icon image upload. The uploaded image record must correctly reference the parent community and contain valid file metadata and storage URL.
 *
 * Special attention is given to verifying that the response image record's community reference matches the original community ID, the storage URL is a valid HTTP URI, the file metadata (name, mime_type, size) matches the input, and the newly created record has no soft-deletion timestamp.
 *
 * 1. Register a new member via authorize_member_join (becomes community owner).
 * 2. Create a community with an initial icon image via generate_random_community_platform_member_communities_create.
 * 3. Prepare a controlled image input with a known name, then upload via generate_random_community_platform_member_communities_images_create.
 * 4. Validate the returned image record satisfies ICommunityPlatformCommunityImage and business logic constraints.
 */
export async function test_api_community_icon_upload_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (community owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community (owner auto-designated)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Prepare a controlled image input and upload
  const imageName = `${RandomGenerator.alphabets(8)}.png`;
  const image =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        body: {
          name: imageName,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(image);
  // 4. Validate business logic constraints
  TestValidator.equals("name matches request", image.name, imageName);
  TestValidator.equals(
    "community id matches path parameter",
    image.community.id,
    community.id,
  );
  TestValidator.predicate("url is a valid HTTP URI", () =>
    image.url.startsWith("http"),
  );
  TestValidator.predicate(
    "deleted_at is null for new record",
    image.deleted_at === null,
  );
  TestValidator.predicate("mime_type is not empty", image.mime_type.length > 0);
  TestValidator.predicate("size is positive", image.size > 0);
  TestValidator.predicate("created_at is present", image.created_at.length > 0);
  TestValidator.predicate("updated_at is present", image.updated_at.length > 0);
}
