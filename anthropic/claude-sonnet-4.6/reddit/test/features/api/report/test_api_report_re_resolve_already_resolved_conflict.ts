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

export async function test_api_report_re_resolve_already_resolved_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a new community (gaining 'owner' role)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Owner subscribes to the community
  const ownerSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(ownerSubscription);
  // 4. Owner creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Register a second member (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 6. Reporter submits a content report against the post
  const report =
    await generate_random_community_member_communities_reports_create(
      reporterConnection,
      {
        body: {
          post_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(report);
  // First resolution (success): Owner dismisses the report
  const resolvedReport =
    await api.functional.community.member.communities.reports.resolve(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: {
          status: "dismissed",
        } satisfies ICommunityReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);
  // Validate that the report is now dismissed and resolver is set
  TestValidator.equals(
    "report status is dismissed",
    resolvedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "resolver is non-null",
    resolvedReport.resolver !== null,
  );
  // Second resolution attempt (conflict): Should return 409
  await TestValidator.httpError(
    "re-resolve already resolved report returns 409",
    409,
    async () => {
      await api.functional.community.member.communities.reports.resolve(
        ownerConnection,
        {
          communityId: community.id,
          reportId: report.id,
          body: {
            status: "approved",
          } satisfies ICommunityReport.IUpdate,
        },
      );
    },
  );
}
