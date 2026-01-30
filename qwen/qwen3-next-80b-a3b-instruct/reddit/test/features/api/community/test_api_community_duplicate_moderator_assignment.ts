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
export async function test_api_community_duplicate_moderator_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Step 2: Use admin connection to login
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAccount.email,
      password: "".padEnd(8, "1"), // This should match the password used in join
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  // Step 3: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(memberAccount);
  // Step 4: Use member connection to login
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAccount.email,
      password: "".padEnd(8, "1"), // This should match the password used in join
    } satisfies ICommunityBbsMember.ILogin,
  });
  // Step 5: Use admin connection to create a community
  const community = await api.functional.communityBbs.member.communities.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies ICommunityBbsCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 6: Get the community code (which is the community id) for moderator assignment
  const communityCode = community.id;
  // Step 7: Get the member ID from the authenticated member account (this will be the moderator ID)
  const moderatorId = memberAccount.id;
  // Step 8: Assign the member (as moderator) to the community (first assignment)
  const assignment1 =
    await api.functional.communityBbs.admin.communities.moderators.create(
      adminConnection,
      {
        communityCode: communityCode,
        body: {
          monitor_id: moderatorId,
        } satisfies ICommunityBbsCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment1);
  // Step 9: Verify that the first assignment creates a valid moderator assignment
  TestValidator.equals(
    "first moderator assignment has correct moderator_id",
    assignment1.moderator_id,
    moderatorId,
  );
  TestValidator.equals(
    "first moderator assignment has correct community_id",
    assignment1.community_id,
    communityCode,
  );
  // Step 10: Attempt duplicate moderator assignment (second attempt)
  await TestValidator.error(
    "Duplicate moderator assignment should fail",
    async () => {
      await api.functional.communityBbs.admin.communities.moderators.create(
        adminConnection,
        {
          communityCode: communityCode,
          body: {
            monitor_id: moderatorId,
          } satisfies ICommunityBbsCommunityModerator.ICreate,
        },
      );
    },
  );
  // Step 11: Verify that no duplicate moderator exists by checking that
  // the community still has only one moderator (no way to list by API, so
  // the error on duplicate attempt proves the system enforces uniqueness)
  // This test passes if the assignment fails on second attempt
}
