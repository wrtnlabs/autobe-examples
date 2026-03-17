import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_update_metadata_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  const originalId = community.id;
  const originalCreatedAt = community.created_at;
  const originalOwnerId = community.owner.id;
  // Step 3: Update community metadata with new values
  const updatedName = `UpdatedCommunity_${RandomGenerator.alphaNumeric(8)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedIconUrl = typia.random<string & tags.Format<"uri">>();
  const updated = await api.functional.community.member.communities.update(
    memberConnection,
    {
      communityId: originalId,
      body: {
        name: updatedName,
        description: updatedDescription,
        icon_url: updatedIconUrl,
      } satisfies ICommunityCommunity.IUpdate,
    },
  );
  typia.assert(updated);
  // Validate business logic: core metadata updated correctly
  TestValidator.equals("community id unchanged", updated.id, originalId);
  TestValidator.equals("community name updated", updated.name, updatedName);
  TestValidator.equals(
    "community description updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "community icon_url updated",
    updated.icon_url,
    updatedIconUrl,
  );
  TestValidator.equals(
    "community owner unchanged",
    updated.owner.id,
    originalOwnerId,
  );
  TestValidator.predicate(
    "subscriber_count non-negative",
    updated.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "updated_at is same or after created_at",
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );
  TestValidator.equals("community not deleted", updated.deleted_at, null);
  // Step 4: Update with null description (clear existing description)
  const updatedWithNullDescription =
    await api.functional.community.member.communities.update(memberConnection, {
      communityId: originalId,
      body: {
        name: updatedName,
        description: null,
        icon_url: updatedIconUrl,
      } satisfies ICommunityCommunity.IUpdate,
    });
  typia.assert(updatedWithNullDescription);
  TestValidator.equals(
    "description cleared to null",
    updatedWithNullDescription.description,
    null,
  );
  TestValidator.equals(
    "id unchanged after null description update",
    updatedWithNullDescription.id,
    originalId,
  );
  TestValidator.equals(
    "owner unchanged after null description update",
    updatedWithNullDescription.owner.id,
    originalOwnerId,
  );
  TestValidator.equals(
    "created_at unchanged after null description update",
    updatedWithNullDescription.created_at,
    originalCreatedAt,
  );
  // Step 5: Update with null icon_url (remove existing icon)
  const updatedWithNullIcon =
    await api.functional.community.member.communities.update(memberConnection, {
      communityId: originalId,
      body: {
        name: updatedName,
        description: null,
        icon_url: null,
      } satisfies ICommunityCommunity.IUpdate,
    });
  typia.assert(updatedWithNullIcon);
  TestValidator.equals(
    "icon_url cleared to null",
    updatedWithNullIcon.icon_url,
    null,
  );
  TestValidator.equals(
    "id unchanged after null icon_url update",
    updatedWithNullIcon.id,
    originalId,
  );
  TestValidator.equals(
    "owner unchanged after null icon_url update",
    updatedWithNullIcon.owner.id,
    originalOwnerId,
  );
  TestValidator.equals(
    "created_at unchanged after null icon_url update",
    updatedWithNullIcon.created_at,
    originalCreatedAt,
  );
}
