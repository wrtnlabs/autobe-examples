import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerationLog";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test that a regular community member (non-moderator, non-owner) is denied
 * access to moderation logs. This scenario validates the authorization
 * restriction that ensures sensitive moderation decisions remain within
 * the governance team.
 *
 * **Test Steps:**
 * 1. Register member A (community owner)
 * 2. Create a community with member A (becomes owner automatically)
 * 3. Register member B (will become moderator)
 * 4. Register member C (regular member with no moderation privileges)
 * 5. Subscribe member B to the community
 * 6. Appoint member B as moderator (creates MODERATOR_ADDED log entry)
 * 7. Subscribe member C to the community
 * 8. Attempt to retrieve the moderation log using member C's credentials
 * 9. Verify the request fails with 403 Forbidden
 */
export async function test_api_moderation_log_access_denied_for_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (will become community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {},
  );
  typia.assert(owner);
  // Step 2: Create a community (member A becomes owner automatically)
  const community: ICommunityCommunity =
    await generate_random_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Register member B (will become moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityMember.IAuthorized = await authorize_member_join(
    moderatorConnection,
    {},
  );
  typia.assert(moderator);
  // Step 4: Register member C (regular member - should be denied access)
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember: ICommunityMember.IAuthorized =
    await authorize_member_join(regularMemberConnection, {});
  typia.assert(regularMember);
  // Step 5: Subscribe member B to the community (required before becoming moderator)
  const moderatorSubscription: ICommunitySubscription =
    await api.functional.community.member.communities.subscribe(
      moderatorConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(moderatorSubscription);
  // Step 6: Appoint member B as moderator (creates MODERATOR_ADDED log entry)
  const moderatorRecord: ICommunityModerator =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator.username },
      },
    );
  typia.assert(moderatorRecord);
  // Step 7: Subscribe member C to the community
  const regularSubscription: ICommunitySubscription =
    await api.functional.community.member.communities.subscribe(
      regularMemberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(regularSubscription);
  // Step 8-9: Attempt to retrieve moderation log with regular member credentials
  // This should fail with 403 Forbidden since regular members cannot access moderation logs
  await TestValidator.httpError(
    "regular member denied access to moderation log",
    403,
    async () =>
      await api.functional.community.member.communities.moderationLogs.at(
        regularMemberConnection,
        {
          communityName: community.name,
          logId: moderatorRecord.id,
        },
      ),
  );
}
