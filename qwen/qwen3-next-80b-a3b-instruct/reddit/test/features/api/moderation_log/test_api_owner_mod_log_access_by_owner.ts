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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_mod_log_access_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(moderator);
  // Step 2: Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(owner);
  // Step 3: Create a report via moderator to generate a moderation log
  const secondReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.moderation.reports.approve(
      moderatorConnection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(secondReport);
  // Step 4: Access the moderation log entry using owner credentials
  const logEntry: ICommunityPlatformModerationLog =
    await api.functional.communityPlatform.owner.moderation.moderation_logs.at(
      ownerConnection,
      {
        logId: secondReport.id,
      },
    );
  typia.assert(logEntry);
  // Step 5: Validate business logic only (type validation is handled by typia.assert)
  // Ensure targetReport is not null before accessing id
  TestValidator.equals(
    "targetReport id matches the created report",
    logEntry.targetReport?.id,
    secondReport.id,
  );
  TestValidator.equals("owner is null", logEntry.owner, null);
  TestValidator.equals("targetComment is null", logEntry.targetComment, null);
  TestValidator.equals("targetBan is null", logEntry.targetBan, null);
}
