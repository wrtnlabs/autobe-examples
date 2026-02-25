import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import type { IRedditReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { generate_random_reddit_member_communities_reports_create } from "../../../generate/generate_random_reddit_member_communities_reports_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";
import { prepare_random_reddit_report } from "../../../prepare/prepare_random_reddit_report";

export async function test_api_report_resolution_retrieval_approve(
  connection: api.IConnection,
) {
  // 1. Auth as member moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Create community context
  const community = await generate_random_reddit_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 3. Submit report to community
  const report = await generate_random_reddit_member_communities_reports_create(
    moderatorConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 5 }),
      },
      params: { communityId: community.id },
    },
  );
  // 4. Approve report by setting resolutionType to 'approve'
  const approval =
    await api.functional.reddit.member.reports.resolutions.resolve(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          resolutionType: "approve",
        } satisfies IRedditReport.IResolution,
      },
    );
  typia.assert(approval);
  // 5. Retrieve resolution details
  // Note: The resolution ID returned by the resolve API is used
  const retrievedResolution =
    await api.functional.reddit.member.reports.resolutions.at(
      moderatorConnection,
      {
        reportId: approval.id,
        resolutionId: approval.id,
      },
    );
  typia.assert(retrievedResolution);
  // 6. Verify resolution details
  TestValidator.equals(
    "resolution type is 'approve'",
    retrievedResolution.resolutionType,
    "approve",
  );
  TestValidator.predicate(
    "moderator should exist",
    retrievedResolution.moderator !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedResolution.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedResolution.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "deletedAt should be null (content deleted)",
    retrievedResolution.deletedAt === null ||
      retrievedResolution.deletedAt === undefined,
  );
}
