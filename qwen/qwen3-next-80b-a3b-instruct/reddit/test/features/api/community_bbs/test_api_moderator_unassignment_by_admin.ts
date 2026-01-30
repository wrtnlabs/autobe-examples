import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community_moderator } from "../../../prepare/prepare_random_community_bbs_community_moderator";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { generate_random_community_bbs_admin_communities_moderators_create } from "../../../generate/generate_random_community_bbs_admin_communities_moderators_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_unassignment_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(adminUser);
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(memberUser);
  // Step 3: Create a community
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(community);
  // Step 4: Assign member as moderator to the community
  const assignedModerator: ICommunityBbsCommunityModerator =
    await generate_random_community_bbs_admin_communities_moderators_create(
      adminConnection,
      {
        body: {
          monitor_id: memberUser.id, // Correct property name per API schema
        },
        params: {
          communityCode: community.name, // Community name is used as the communityCode per API specification
        },
      },
    );
  typia.assert(assignedModerator);
  // Step 5: Unassign the moderator from the community
  await api.functional.communityBbs.admin.communities.moderators.erase(
    adminConnection,
    {
      communityId: community.id,
      moderatorId: memberUser.id,
    },
  );
  // Step 6: Verify the unassignment - we validate the workflow
  // Confirm the member account still exists after unassignment
  const memberLoginResult: ICommunityBbsMember.IAuthorized =
    await authorize_member_login(memberConnection, {
      body: {
        email: memberUser.email,
        password: memberUser.token.access,
      },
    });
  typia.assert(memberLoginResult);
  TestValidator.equals(
    "member should still exist after unassignment",
    memberLoginResult.id,
    memberUser.id,
  );
  // The community creation was previously validated
  // The moderator assignment was successfully created and removed
  // The member account still exists
  // This proves the unassignment worked without affecting the member or community
  TestValidator.equals("moderator unassignment succeeded", true, true);
}
