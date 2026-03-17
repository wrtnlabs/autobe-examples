import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
 * Test retrieving file metadata for a community icon image that is still processing.
 * 1. Create member account to own community
 * 2. Create community to attach icon image
 * 3. Upload community icon image (creates file with processing status)
 * 4. Retrieve file metadata
 * 5. Validate processing status and limited metadata
 */
export async function test_api_file_retrieval_processing_community_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community owned by member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Upload community icon image with processing status
  const imageBody = {
    uri: typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
    filename: RandomGenerator.name(1) + ".jpg",
    content_type: "image/jpeg",
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
    >() satisfies number as number,
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
    >() satisfies number as number,
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2097152>
    >() satisfies number as number,
    ordering: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    active: false,
  } satisfies ICommunityPlatformCommunityImage.ICreate;
  const image =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        body: imageBody,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(image);
  // 4. Retrieve file metadata
  const file = await api.functional.communityPlatform.files.at(
    memberConnection,
    {
      fileId: image.id,
    },
  );
  typia.assert(file);
  // 5. Validate processing status and limited metadata
  TestValidator.equals(
    "file status should be processing",
    file.status,
    "processing",
  );
  TestValidator.equals(
    "public_url should be null for processing files",
    file.public_url,
    null,
  );
  TestValidator.equals(
    "actor_type should be community",
    file.actor_type,
    "community",
  );
  TestValidator.equals(
    "actor_id should match community ID",
    file.actor_id,
    community.id,
  );
}
