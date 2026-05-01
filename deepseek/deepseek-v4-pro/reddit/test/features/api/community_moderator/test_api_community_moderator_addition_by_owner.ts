import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";

/**
 * Test that a community owner can successfully add another member as a regular moderator.
 *
 * Validates the core happy path of the moderator appointment workflow within the
 * two-tier community governance hierarchy. The owner creates a community and then
 * appoints a different member as a moderator by providing their username through
 * the moderator creation endpoint.
 *
 * The response must return a moderator role record with role set to 'moderator',
 * the addedByMember field referencing the owner's public profile summary, and the
 * member field containing the target member's public profile. This confirms the
 * governance hierarchy is correctly established and the audit trail of moderator
 * assignments is properly maintained with the appointing member recorded.
 *
 * 1. Create and authenticate the community owner via member join.
 * 2. Owner creates a community to govern with a random name and description.
 * 3. Create and authenticate the target member who will become moderator.
 * 4. Owner adds the target member as moderator by supplying their username.
 * 5. Validate the moderator record: role is 'moderator', member matches target, addedByMember is owner.
 */
export async function test_api_community_moderator_addition_by_owner(
  connection: api.IConnection,
) {
  // 1. Create and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a community to govern
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create the target member on a separate connection
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {});
  typia.assert(targetMember);
  // 4. Owner adds the target member as moderator by username
  const moderator =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        body: { username: targetMember.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(moderator);
  // 5. Validate the moderator role record
  TestValidator.equals("moderator role", moderator.role, "moderator");
  TestValidator.equals(
    "moderator member username",
    moderator.member.username,
    targetMember.username,
  );
  TestValidator.equals(
    "moderator member id",
    moderator.member.id,
    targetMember.id,
  );
  TestValidator.predicate(
    "addedByMember is present",
    moderator.addedByMember !== null,
  );
  // Safe: non-null validated above by predicate
  TestValidator.equals(
    "addedByMember is owner",
    moderator.addedByMember!.id,
    owner.id,
  );
  TestValidator.equals(
    "addedByMember username matches owner",
    moderator.addedByMember!.username,
    owner.username,
  );
}
