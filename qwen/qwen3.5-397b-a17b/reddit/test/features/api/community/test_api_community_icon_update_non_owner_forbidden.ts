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
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that a non-owner member cannot update a community's icon.
 *
 * This test verifies the authorization enforcement for community icon updates:
 * 1. Member A registers and creates a community (becomes owner)
 * 2. Member B registers as a different user
 * 3. Member B attempts to update the community's icon
 * 4. The operation should fail with authorization error since Member B is not the owner
 */
export async function test_api_community_icon_update_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Register member B (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(nonOwnerAuth);
  // 3. Member A creates a community (becomes owner)
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member B attempts to update the community's icon (should fail)
  const iconUpdateBody: IRedditCommunityCommunityIcon.IUpdate = {
    storage_key: RandomGenerator.alphaNumeric(32),
    original_filename: "test-icon.png",
    mime_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
  // 5. Verify the operation fails with authorization error
  await TestValidator.error(
    "non-owner cannot update community icon",
    async () => {
      await api.functional.redditCommunity.member.communities.icon.update(
        nonOwnerConnection,
        {
          communityName: community.name,
          body: iconUpdateBody,
        },
      );
    },
  );
}
