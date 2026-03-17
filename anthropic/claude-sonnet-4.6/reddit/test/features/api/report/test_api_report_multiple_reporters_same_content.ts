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

export async function test_api_report_multiple_reporters_same_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the post author and set up author connection
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Author creates a community
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 3. Author subscribes to the community (required to post)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Author creates a text post in the community
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
  // 5. Register reporter1 (NOT subscribed to the community)
  const reporter1Connection: api.IConnection = { host: connection.host };
  const reporter1 = await authorize_member_join(reporter1Connection, {});
  typia.assert(reporter1);
  // 6. Register reporter2 (also NOT subscribed to the community)
  const reporter2Connection: api.IConnection = { host: connection.host };
  const reporter2 = await authorize_member_join(reporter2Connection, {});
  typia.assert(reporter2);
  // 7. Reporter1 submits a report on the post
  const reason1 = `Reporter1 reason: ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const report1 =
    await generate_random_community_member_communities_reports_create(
      reporter1Connection,
      {
        body: {
          post_id: post.id,
          comment_id: null,
          reason: reason1,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(report1);
  // 8. Reporter2 submits an independent report on the same post
  const reason2 = `Reporter2 reason: ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const report2 =
    await generate_random_community_member_communities_reports_create(
      reporter2Connection,
      {
        body: {
          post_id: post.id,
          comment_id: null,
          reason: reason2,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(report2);
  // 9. Validate report1 fields
  TestValidator.equals(
    "report1 reporter id matches reporter1",
    report1.reporter.id,
    reporter1.id,
  );
  TestValidator.equals("report1 reason matches", report1.reason, reason1);
  TestValidator.equals("report1 status is pending", report1.status, "pending");
  TestValidator.predicate("report1 post id matches", () => {
    const p = report1.post;
    return p !== null && p.id === post.id;
  });
  TestValidator.equals("report1 resolver is null", report1.resolver, null);
  // 10. Validate report2 fields
  TestValidator.equals(
    "report2 reporter id matches reporter2",
    report2.reporter.id,
    reporter2.id,
  );
  TestValidator.equals("report2 reason matches", report2.reason, reason2);
  TestValidator.equals("report2 status is pending", report2.status, "pending");
  TestValidator.predicate("report2 post id matches", () => {
    const p = report2.post;
    return p !== null && p.id === post.id;
  });
  TestValidator.equals("report2 resolver is null", report2.resolver, null);
  // 11. Validate reports are distinct records
  TestValidator.notEquals("report ids are distinct", report1.id, report2.id);
}
