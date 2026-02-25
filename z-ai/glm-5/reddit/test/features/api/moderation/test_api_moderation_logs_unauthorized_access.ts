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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerationLog";
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
 * Test that authorization is properly enforced for moderation logs access.
 *
 * A community owner creates a community and performs moderation actions (adds a moderator).
 * Then a different member who is only subscribed to the community (not a moderator)
 * attempts to access the moderation logs endpoint. The system must return 403 Forbidden
 * with an appropriate authorization error message. This validates the security
 * requirement that moderation audit trails are only visible to users with moderation
 * authority within that specific community.
 */
export async function test_api_moderation_logs_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates community (becomes owner automatically)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 2. Member who will become moderator - subscribe and get appointed
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  await api.functional.community.member.communities.subscribe(
    moderatorConnection,
    { communityName: community.name },
  );
  await generate_random_community_member_communities_moderators_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: { member_username: moderator.username },
    },
  );
  // 3. Regular member (non-moderator) who will attempt unauthorized access
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(
    regularMemberConnection,
    {},
  );
  typia.assert(regularMember);
  // Subscribe to community (this member has no moderation privileges)
  await api.functional.community.member.communities.subscribe(
    regularMemberConnection,
    { communityName: community.name },
  );
  // 4. Regular member attempts to access moderation logs - should fail with 403
  await TestValidator.httpError(
    "regular member cannot access moderation logs",
    403,
    async () =>
      await api.functional.community.member.communities.moderationLogs.index(
        regularMemberConnection,
        {
          communityName: community.name,
          body: {},
        },
      ),
  );
}
