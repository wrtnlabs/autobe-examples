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

export async function test_api_report_approve_already_resolved_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member who will be the community owner / moderator
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community (owner auto-becomes moderator/owner)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register a second member who will author the post to be reported
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 4. Subscribe the second member (author) to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Second member creates a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
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
  // 6. Owner subscribes to community (required to submit a report)
  const ownerSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(ownerSubscription);
  // 7. Owner submits a report against the post
  const report =
    await generate_random_community_member_communities_reports_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          post_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 8. First approval: should succeed with status 'approved'
  const approvedReport =
    await api.functional.community.member.communities.reports.approve(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "report status is approved after first approval",
    approvedReport.status,
    "approved",
  );
  // 9. Second approval attempt: should return 409 Conflict
  await TestValidator.httpError(
    "second approval attempt on already-approved report returns 409",
    409,
    async () => {
      await api.functional.community.member.communities.reports.approve(
        ownerConnection,
        {
          communityId: community.id,
          reportId: report.id,
        },
      );
    },
  );
}
