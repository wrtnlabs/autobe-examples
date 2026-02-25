import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
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

export async function test_api_moderator_appointment_unauthorized_failure(
  connection: api.IConnection,
): Promise<void> {
  // Test: Non-moderator cannot appoint moderators
  // Validates authorization boundary - only owners and existing moderators
  // can grant moderation privileges
  // 1. Create community owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 2. Create regular member (not owner, not moderator) and subscribe
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(
    regularMemberConnection,
    {},
  );
  typia.assert(regularMember);
  await api.functional.community.member.communities.subscribe(
    regularMemberConnection,
    {
      communityName: community.name,
    },
  );
  // 3. Create target member and subscribe
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {});
  typia.assert(targetMember);
  await api.functional.community.member.communities.subscribe(
    targetMemberConnection,
    {
      communityName: community.name,
    },
  );
  // 4. Regular member attempts to appoint target as moderator - should fail
  await TestValidator.httpError(
    "non-moderator cannot appoint moderators",
    403,
    async () =>
      await api.functional.community.member.communities.moderators.create(
        regularMemberConnection,
        {
          communityName: community.name,
          body: {
            member_username: targetMember.username,
          } satisfies ICommunityModerator.ICreate,
        },
      ),
  );
}
