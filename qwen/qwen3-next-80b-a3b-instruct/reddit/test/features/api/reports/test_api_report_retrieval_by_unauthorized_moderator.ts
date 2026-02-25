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

export async function test_api_report_retrieval_by_unauthorized_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Moderator A (unauthorized to community of report)
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const moderatorA = await authorize_community_moderator_join(
    moderatorAConnection,
    { body: moderatorAJoinBody },
  );
  typia.assert(moderatorA);
  const moderatorAPassword = moderatorAJoinBody.password;
  
  // 2. Create Moderator B (will file a report in some community)
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const moderatorB = await authorize_community_moderator_join(
    moderatorBConnection,
    { body: moderatorBJoinBody },
  );
  typia.assert(moderatorB);
  const moderatorBPassword = moderatorBJoinBody.password;
  
  // 3. Authenticate as Moderator B and submit a report
  const moderatorBAuthConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(moderatorBAuthConnection, {
    body: {
      email: moderatorB.email,
      password: moderatorBPassword, // Use the same password from join
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });
  const report = await api.functional.redditCommunity.member.reports.create(
    moderatorBAuthConnection,
    {
      body: {
        reason: "Inappropriate content",
        postId: typia.random<string & tags.Format<"uuid">>(), // Use a valid UUID format
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  
  // 4. Authenticate as Moderator A (unauthorized)
  const moderatorAAuthConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(moderatorAAuthConnection, {
    body: {
      email: moderatorA.email,
      password: moderatorAPassword, // Reuse password from join
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });
  
  // 5. Attempt to retrieve report as unauthorized moderator — expect 403 Forbidden
  try {
    await api.functional.redditCommunity.communityModerator.reports.at(
      moderatorAAuthConnection,
      {
        reportId: report.id,
      },
    );
    throw new Error(
      "Expected 403 Forbidden when unauthorized moderator retrieves a report from a community they don't moderate",
    );
  } catch (error) {
    TestValidator.httpError(
      "Unauthorized moderator should receive 403 Forbidden",
      403,
      () => {
        throw error;
      },
    );
  }
} 