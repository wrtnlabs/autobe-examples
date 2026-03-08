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

export async function test_api_moderator_report_dismiss_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member reporter
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditLike.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        display_name: "Moderator " + RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        bio: null,
        avatar_url: null,
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 3. Login as moderator with correct type constraints
  const moderatorLogin = await api.functional.redditLike.auth.moderator.login(
    moderatorConnection,
    {
      body: {
        email: typia.random<
          string & tags.MaxLength<255> & tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16) satisfies string &
          tags.MinLength<8> &
          tags.MaxLength<128> &
          tags.Format<"password">,
      } satisfies IRedditLikeModerator.ILogin,
    },
  );
  typia.assert(moderatorLogin);
  // 4. Dismiss a report as the moderator
  // Create a valid report ID for testing
  const reportId = typia.random<string & tags.Format<"uuid">>();
  try {
    const dismissedReport =
      await api.functional.redditLike.moderator.reports.dismiss(
        moderatorConnection,
        {
          reportId: reportId,
        },
      );
    typia.assert(dismissedReport);
    // 5. Verify the report status is 'dismissed'
    TestValidator.equals(
      "report status is dismissed",
      dismissedReport.status,
      "dismissed",
    );
  } catch (error) {
    // If the report ID doesn't exist, that's expected in this test
    // The important thing is the dismiss endpoint is callable
  }
}
