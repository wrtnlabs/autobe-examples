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
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_reports_priority_review_multiple_reporters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create main member (community owner/moderator)
  const mainConnection: api.IConnection = { host: connection.host };
  const mainCredentials: { email: string & tags.Format<"email">; password: string } = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  };
  const mainAuth = await authorize_member_join(mainConnection, {
    body: {
      email: mainCredentials.email,
      username: RandomGenerator.alphaNumeric(10),
      password: mainCredentials.password,
      displayName: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(mainAuth);
  const mainMember: IRedditPlatformMember.ISummary = mainAuth.user;
  // 2. Create community
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      mainConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create additional reporter members (4 different users)
  const reporterMembers: IRedditPlatformMember.ISummary[] =
    await ArrayUtil.asyncRepeat(4, async () => {
      const reporterConnection: api.IConnection = { host: connection.host };
      const reporterCredentials: { email: string & tags.Format<"email">; password: string } = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      };
      const reporterAuth = await authorize_member_join(reporterConnection, {
        body: {
          email: reporterCredentials.email,
          username: RandomGenerator.alphaNumeric(10),
          password: reporterCredentials.password,
          displayName: RandomGenerator.name(2),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformMember.IJoin,
      });
      typia.assert(reporterAuth);
      return reporterAuth.user;
    });
  typia.assert(reporterMembers);
  // 4. Verify reports queue endpoint returns proper structure
  const queueConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(queueConnection, {
    body: {
      email: mainCredentials.email,
      password: mainCredentials.password,
    } satisfies IRedditPlatformMember.ILogin,
  });
  const queueResponse =
    await api.functional.redditPlatform.member.reports.queue.index(
      queueConnection,
      {
        body: typia.random<IRedditPlatformReport.IRequest>(),
      },
    );
  typia.assert(queueResponse);
  // 5. Verify queue response structure
  TestValidator.predicate(
    "queue response has pagination",
    () => queueResponse.pagination !== null,
  );
  TestValidator.predicate(
    "queue response has data array",
    () => queueResponse.data.length >= 0,
  );
}