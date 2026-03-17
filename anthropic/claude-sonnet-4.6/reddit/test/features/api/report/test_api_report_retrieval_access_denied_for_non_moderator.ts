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

export async function test_api_report_retrieval_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register second member (reporter/content creator)
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 4. Second member subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      reporterConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Second member creates a text post
  const post = await api.functional.community.member.communities.posts.create(
    reporterConnection,
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
  // 6. Second member submits a report against the post
  const report =
    await generate_random_community_member_communities_reports_create(
      reporterConnection,
      {
        params: { communityId: community.id },
        body: {
          post_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 7. Register third member (ordinary member, not a moderator)
  const ordinaryMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ordinaryMemberConnection, {});
  // Test execution: Ordinary member attempts to access report detail — must be denied
  await TestValidator.httpError(
    "non-moderator access to report must be denied with 403",
    403,
    async () => {
      await api.functional.community.member.communities.reports.at(
        ordinaryMemberConnection,
        {
          communityId: community.id,
          reportId: report.id,
        },
      );
    },
  );
}
