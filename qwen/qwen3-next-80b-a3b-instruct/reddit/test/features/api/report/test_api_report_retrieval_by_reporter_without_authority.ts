import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_retrieval_by_reporter_without_authority(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular member account (reporter without authority)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // As member (reporter), create a report on a post
  // Use a random postId as we cannot create one and must rely on system state
  const postId = typia.random<string & tags.Format<"uuid">>();
  const authedMemberConnection: api.IConnection = { host: connection.host };
  // Extract and assert non-null email for login
  const memberEmail = typia.assert<string & tags.Format<"email">>(member.email);
  await authorize_member_login(authedMemberConnection, {
    body: {
      email: memberEmail,
      password: member.token.access,
    } satisfies IRedditCommunityMember.ILogin,
  });
  const report = await api.functional.redditCommunity.member.reports.create(
    authedMemberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        postId: postId,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // Attempt to retrieve the report as the reporter (member) without authority
  // This should fail with 403 Forbidden
  const reporterConnection: api.IConnection = { host: connection.host };
  // Extract and assert non-null email for login
  const reporterEmail = typia.assert<string & tags.Format<"email">>(
    member.email,
  );
  await authorize_member_login(reporterConnection, {
    body: {
      email: reporterEmail,
      password: member.token.access,
    } satisfies IRedditCommunityMember.ILogin,
  });
  await TestValidator.httpError(
    "reporter without authority cannot retrieve report",
    403,
    async () => {
      await api.functional.redditCommunity.communityModerator.reports.at(
        reporterConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
