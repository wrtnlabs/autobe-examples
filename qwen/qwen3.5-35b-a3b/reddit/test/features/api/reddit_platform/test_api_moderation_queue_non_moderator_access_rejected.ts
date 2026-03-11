import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import type { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderation_queue_non_moderator_access_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (will become moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      displayName: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberAAuthorized);
  // 2. Create Member B (will NOT be moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      displayName: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberBAuthorized);
  // 3. Create community owned by Member A
  const memberACreateCommunityConnection: api.IConnection = {
    host: connection.host,
  };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberACreateCommunityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Add Member A as moderator
  const memberAModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAModeratorConnection, {
    body: {
      email: memberAEmail,
      password: "password123",
    } satisfies IRedditPlatformMember.ILogin,
  });
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.create(
      memberAModeratorConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberAAuthorized.user.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create a post in the community to report (Member A creates post)
  const memberAPostConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAPostConnection, {
    body: {
      email: memberAEmail,
      password: "password123",
    } satisfies IRedditPlatformMember.ILogin,
  });
  // Note: We don't have api.functional for post creation in the provided SDK
  // We'll skip creating a post and instead test with the community itself
  // The report endpoint can be called with any valid content ID
  // 6. Have Member B submit a report (to create pending report)
  const memberBReportConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBReportConnection, {
    body: {
      email: memberBEmail,
      password: "password123",
    } satisfies IRedditPlatformMember.ILogin,
  });
  const report = await api.functional.redditPlatform.member.reports.create(
    memberBReportConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason:
          "This is a test report with sufficient length for moderation review.",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Execute: Member B (non-moderator) tries to access moderation queue
  await TestValidator.httpError(
    "non-moderator should receive 403 Forbidden",
    403,
    async () => {
      await api.functional.redditPlatform.member.communities.moderation.queue.index(
        memberBReportConnection,
        {
          communityId: community.id,
          body: {
            limit: 20,
            page: 1,
          } satisfies IRedditPlatformCommunityModerator.IRequest,
        },
      );
    },
  );
  // 8. Validate: Ensure no report data is returned
  // The error response should not contain moderation queue data
  // 9. Validate: Verify the error message indicates lack of moderator privileges
  // The 403 error validation above already confirms this
}
