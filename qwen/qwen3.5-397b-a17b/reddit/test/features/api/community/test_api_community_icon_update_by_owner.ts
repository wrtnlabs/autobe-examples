import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_icon_create } from "../../../generate/generate_random_reddit_community_member_communities_icon_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_community_icon } from "../../../prepare/prepare_random_reddit_community_community_icon";

/**
 * Test community icon update by owner.
 *
 * This test verifies that a community owner can successfully update their
 * community's icon image. The test creates a member account, creates a community,
 * uploads an initial icon, and then updates it with new metadata.
 *
 * Test Flow:
 * 1. Register new member account
 * 2. Create community with member as owner
 * 3. Upload initial icon to establish existing icon
 * 4. Update icon with new metadata
 * 5. Validate icon update response
 */
export async function test_api_community_icon_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Create community with member as owner
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Upload initial icon to establish existing icon for replacement test
  const initialIconCommunity =
    await generate_random_reddit_community_member_communities_icon_create(
      memberConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          uri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityIcon.ICreate,
      },
    );
  typia.assert(initialIconCommunity);
  // 5. Prepare update body with new metadata
  const updateBody = {
    storage_key: RandomGenerator.alphaNumeric(32),
    original_filename: `new_icon_${RandomGenerator.alphabets(8)}.png`,
    mime_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1000>>(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
  } satisfies IRedditCommunityCommunityIcon.IUpdate;
  // 6. Update the community's icon with new metadata
  const updatedIcon =
    await api.functional.redditCommunity.member.communities.icon.update(
      memberConnection,
      {
        communityName: community.name,
        body: updateBody,
      },
    );
  typia.assert(updatedIcon);
  // 7. Validate business logic - icon metadata matches update request
  TestValidator.equals(
    "storage key matches update",
    updatedIcon.storageKey,
    updateBody.storage_key,
  );
  TestValidator.equals(
    "original filename matches",
    updatedIcon.originalFilename,
    updateBody.original_filename,
  );
  TestValidator.equals(
    "mime type matches",
    updatedIcon.mimeType,
    updateBody.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    updatedIcon.fileSize,
    updateBody.file_size,
  );
  // 8. Validate dimensions with proper null handling
  if (updateBody.width !== null && updateBody.width !== undefined) {
    TestValidator.equals(
      "width matches update",
      updatedIcon.width,
      updateBody.width,
    );
  }
  if (updateBody.height !== null && updateBody.height !== undefined) {
    TestValidator.equals(
      "height matches update",
      updatedIcon.height,
      updateBody.height,
    );
  }
  // 9. Verify community relationship
  TestValidator.equals(
    "community id matches",
    updatedIcon.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    updatedIcon.community.name,
    community.name,
  );
  // 10. Verify icon is active (not soft-deleted)
  TestValidator.equals("icon is not deleted", updatedIcon.deletedAt, null);
}
