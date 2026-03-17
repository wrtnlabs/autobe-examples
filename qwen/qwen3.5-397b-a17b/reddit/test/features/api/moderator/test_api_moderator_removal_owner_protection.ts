import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test the critical business rule that prevents removal of the community owner from the moderator list.
 *
 * Test Steps:
 * 1. Create a member account (community owner) via POST /redditClone/auth/member/join using authorize_member_join utility
 * 2. Create a community via POST /redditClone/communities using generate_random_reddit_clone_communities_create utility - the creator automatically becomes owner with is_owner=true
 * 3. Attempt to delete the owner's own moderator record via DELETE /redditClone/member/communities/{communityId}/moderators/{moderatorId} using the owner's connection and moderator ID
 *
 * Validation Points:
 * - The DELETE operation is rejected with an error (403 Forbidden)
 * - The error indicates that the community owner cannot be removed
 * - This protects the community from losing its owner and ensures there's always at least one owner with full authority
 *
 * This test validates the business rule: 'Moderators cannot remove the owner from the moderator list.'
 */
export async function test_api_moderator_removal_owner_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community - owner's moderator record is automatically created with is_owner=true
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Attempt to delete the owner's own moderator record
  // This should fail with 403 Forbidden as the owner cannot be removed
  await TestValidator.error(
    "owner cannot be removed from moderators",
    async () => {
      await api.functional.redditClone.member.communities.moderators.erase(
        ownerConnection,
        {
          communityId: community.id,
          moderatorId: community.owner.id,
        },
      );
    },
  );
}
