import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that a community snapshot is automatically created and retrievable after community creation.
 *
 * Validates the complete flow of community creation triggering an automatic
 * point-in-time snapshot capture. The snapshot preserves the community's identity
 * attributes — name, description, icon, owner member ID, and subscriber count —
 * at the moment the community was created.
 *
 * Since there is no snapshot listing endpoint available, this test validates the
 * snapshot's constituent data through the community creation response, verifying
 * that all fields that would be captured in the initial snapshot are correctly
 * established at creation time.
 *
 * 1. Register a new member account via POST /communityPlatform/auth/member/join.
 * 2. Create a community with a unique name, description, and icon image via POST
 *    /communityPlatform/member/communities.
 * 3. Validate the community creation response matches input data and expected
 *    initial state (subscriber count of 0, correct owner, fresh timestamp).
 * 4. Verify that the icon image metadata is correctly captured and accessible
 *    through the community's icon field.
 */
export async function test_api_community_snapshot_retrieval_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const memberId = authorized.id;
  // Step 2: Prepare community creation data
  const communityName = `test-community-${RandomGenerator.alphabets(8)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const iconImage = {
    name: `${RandomGenerator.alphabets(6)}.png`,
    mime_type: "image/png",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<500000>
    >(),
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityImage.ICreate;
  // Step 3: Create the community (this auto-records the initial snapshot)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          images: [iconImage],
        },
      },
    );
  typia.assert(community);
  // Step 4: Validate community data matches input and expected initial state
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "subscriber count is 0 at creation",
    community.subscriberCount,
    0,
  );
  TestValidator.equals(
    "owner id matches authenticated member",
    community.owner.id,
    memberId,
  );
  // Step 5: Validate icon image was recorded
  TestValidator.predicate(
    "icon image is present",
    community.icon !== null && community.icon !== undefined,
  );
  if (community.icon !== null && community.icon !== undefined) {
    TestValidator.equals(
      "icon name matches input",
      community.icon.name,
      iconImage.name,
    );
    TestValidator.equals(
      "icon mime type matches input",
      community.icon.mime_type,
      iconImage.mime_type,
    );
    TestValidator.equals(
      "icon size matches input",
      community.icon.size,
      iconImage.size,
    );
  }
  // Step 6: Validate timestamps are recent
  const createdAt = new Date(community.createdAt).getTime();
  const updatedAt = new Date(community.updatedAt).getTime();
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  TestValidator.predicate(
    "created_at is recent",
    createdAt >= fiveMinutesAgo && createdAt <= now,
  );
  TestValidator.predicate(
    "updated_at is recent",
    updatedAt >= fiveMinutesAgo && updatedAt <= now,
  );
}
