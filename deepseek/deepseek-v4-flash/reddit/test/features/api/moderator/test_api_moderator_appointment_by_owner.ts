import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that a community owner can successfully appoint another registered member as a moderator.
 *
 * Validates the moderator appointment workflow where the community owner (Member A) creates a community, then appoints another member (Member B) as a moderator through the dedicated moderator appointment endpoint. Ensures that the moderator record correctly reflects the appointed member, the scoped community, and the appointing owner's identity.
 *
 * Special attention is given to verifying the role field is set to 'moderator', the member, community, and appointed_by relations contain correct summary data, and that system-generated fields (id, created_at, updated_at) are present and non-null.
 *
 * 1. Member A registers via POST /communityPlatform/auth/member/join.
 * 2. Member A creates a community via POST /member/communities — Member A becomes the owner.
 * 3. Member B registers via POST /communityPlatform/auth/member/join.
 * 4. Member A calls POST /member/moderators with the community name and Member B's username.
 * 5. Validates the returned moderator record matches all expected fields and relations.
 */
export async function test_api_moderator_appointment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (future community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community as Member A (becomes owner)
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register Member B (future moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member A appoints Member B as moderator
  const moderator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.member.moderators.create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: memberB.username,
        } satisfies ICommunityPlatformModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 5. Validate the moderator record
  TestValidator.equals("role is moderator", moderator.role, "moderator");
  // 5.1. Validate member relation (Member B's summary)
  TestValidator.equals(
    "member id",
    moderator.member.id,
    memberB.profile.member.id,
  );
  TestValidator.equals(
    "member username",
    moderator.member.username,
    memberB.username,
  );
  // 5.2. Validate community relation
  TestValidator.equals("community id", moderator.community.id, community.id);
  TestValidator.equals(
    "community name",
    moderator.community.name,
    community.name,
  );
  // 5.3. Validate appointed_by relation (Member A's summary)
  TestValidator.equals(
    "appointed by id",
    moderator.appointed_by!.id,
    memberA.profile.member.id,
  );
  TestValidator.equals(
    "appointed by username",
    moderator.appointed_by!.username,
    memberA.username,
  );
}
