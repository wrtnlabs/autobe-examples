import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderation_log_access_denied_to_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  // Step 2: Authenticate as moderator to obtain access token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(adminConnection, {
    body: {
      email: moderatorEmail, // Use the same email as in join
      password: moderatorPassword,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Step 3: Approve a report to generate a moderation log entry
  // We'll use a random reportId - the system should create the report internally
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.moderation.reports.approve(
      adminConnection,
      {
        reportId: reportId,
      },
    );
  typia.assert(report);
  // Step 4: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 5: Authenticate as member to obtain access token
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(userConnection, {
    body: {
      email: memberEmail, // Use the same email as in join
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 6: Attempt to access the moderation log as a member (should be denied)
  await TestValidator.error(
    "member should be denied access to moderation log",
    async () => {
      await api.functional.communityPlatform.moderator.moderation.moderation_logs.at(
        userConnection,
        {
          logId: report.id, // Use the ID from the approved report
        },
      );
    },
  );
}
