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

export async function test_api_report_resolution_retrieval_dismiss(
  connection: api.IConnection,
) {
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  const community = await generate_random_reddit_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.name(1) + "-community",
        description: RandomGenerator.paragraph(),
        icon_url: "https://example.com/icon.png",
      } satisfies IRedditCommunity.ICreate,
    },
  );
  const report = await generate_random_reddit_member_communities_reports_create(
    moderatorConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditReport.ICreate,
      params: { communityId: community.id },
    },
  );
  const dismissalReason = RandomGenerator.paragraph({ sentences: 3 });
  const resolutionResponse =
    await api.functional.reddit.member.reports.resolutions.resolve(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          resolutionType: "dismiss",
          dismissalReason,
        } satisfies IRedditReport.IResolution,
      },
    );
  const resolutionId = resolutionResponse.id;
  const resolution = await api.functional.reddit.member.reports.resolutions.at(
    moderatorConnection,
    {
      reportId: report.id,
      resolutionId: resolutionId,
    },
  );
  typia.assert(resolution);
  TestValidator.equals(
    "resolutionType matches",
    resolution.resolutionType,
    "dismiss",
  );
  TestValidator.predicate(
    "dismissalReason length within bounds",
    dismissalReason.length >= 10 && dismissalReason.length <= 500,
  );
  TestValidator.equals(
    "dismissalReason matches",
    resolution.dismissalReason,
    dismissalReason,
  );
}
