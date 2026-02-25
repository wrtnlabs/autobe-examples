import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_communities_moderators_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_moderators_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_community_moderator } from "../../../prepare/prepare_random_reddit_community_community_moderator";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_community_reports_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create community owner actor
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: ownerPassword,
      displayName: RandomGenerator.name(),
    },
  });
  // Create member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // Create community moderator actor
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: moderatorPassword,
        username: RandomGenerator.name(1),
      },
    },
  );
  // Create community by owner
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  // Assign member as moderator to community
  await generate_random_reddit_community_community_owner_communities_moderators_create(
    ownerConnection,
    {
      body: {
        userId: member.id,
      },
      params: {
        communityId: community.id,
      },
    },
  );
  // Submit a report against a post by member
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  // Authenticate moderator with the community
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(moderatorAuthConnection, {
    body: {
      email: moderator.email,
      password: moderatorPassword, // Use original password variable instead of attempting to access non-existent property
    },
  });
  // Retrieve pending reports for the community using utility function
  const reports =
    await api.functional.redditCommunity.communityModerator.communities.reports.index(
      moderatorAuthConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(reports);
  // Validate that exactly one pending report exists
  TestValidator.equals("one pending report", reports.data.length, 1);
  TestValidator.equals("report status", reports.data[0].status, "pending");
  TestValidator.equals(
    "reporter username",
    reports.data[0].reporter_username,
    member.username,
  );
  TestValidator.equals(
    "target post summary is null (no post created)",
    reports.data[0].target_post_summary === null,
    true,
  );
}
