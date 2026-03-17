import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
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
import { generate_random_community_member_communities_reports_create } from "../../../generate/generate_random_community_member_communities_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_dismiss_already_dismissed_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create a community as member A
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Register member B (poster)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member B subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Member B creates a text post
  const post = await api.functional.community.member.communities.posts.create(
    memberBConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Register member C (reporter)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // 7. Member C reports the post
  const report =
    await generate_random_community_member_communities_reports_create(
      memberCConnection,
      {
        params: { communityId: community.id },
        body: {
          post_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // First dismiss action (expected to succeed)
  const dismissedReport =
    await api.functional.community.member.communities.reports.dismiss(
      memberAConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "first dismiss status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  // Main test — second dismiss attempt (expected to fail)
  await TestValidator.httpError(
    "dismiss already dismissed report should fail",
    [409, 422],
    async () => {
      await api.functional.community.member.communities.reports.dismiss(
        memberAConnection,
        {
          communityId: community.id,
          reportId: report.id,
        },
      );
    },
  );
}
