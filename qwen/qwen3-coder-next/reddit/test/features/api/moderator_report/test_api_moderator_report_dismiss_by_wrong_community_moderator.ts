import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_dismiss_by_wrong_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a report in Community A with valid post reference
  const memberConnection: api.IConnection = { host: connection.host };
  const report = await api.functional.redditLike.member.reports.create(
    memberConnection,
    {
      body: {
        reported_post_id: typia.random<string & tags.Format<"uuid">>(),
        reported_comment_id: null,
        reason: "Inappropriate content in Community A",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 2: Authenticate as moderator for different community (Community B)
  const wrongModeratorConnection: api.IConnection = { host: connection.host };
  const moderatorCredentials = {
    email: typia.random<string & (tags.Format<"email"> & tags.MaxLength<255>)>() as string & (tags.Format<"email"> & tags.MaxLength<255>),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeModerator.ILogin;
  await authorize_moderator_join(wrongModeratorConnection, {
    body: {
      email: moderatorCredentials.email,
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      password: moderatorCredentials.password,
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Step 3: Attempt to dismiss report - should fail with 403 Forbidden
  await TestValidator.httpError(
    "moderator from Community B cannot dismiss report from Community A",
    403,
    async () => {
      await api.functional.redditLike.moderator.reports.dismiss(
        wrongModeratorConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
  // Step 4: Verify report status remains 'pending'
  TestValidator.equals("report status unchanged", report.status, "pending");
}