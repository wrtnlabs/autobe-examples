import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_log_admin_search_only(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Search for moderation action logs with proper random pagination
  const searchResults =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate search results contain at least one log
  TestValidator.predicate(
    "search results should contain logs",
    searchResults.data.length > 0,
  );
  // Extract first log ID from search results
  const logId = searchResults.data[0]!.id;
  // Retrieve specific moderation action log
  const detailedLog =
    await api.functional.communityPlatform.admin.moderation_action_logs.at(
      adminConnection,
      {
        logId: logId satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
      },
    );
  typia.assert(detailedLog);
  // Validate the retrieved log matches the expected structure
  TestValidator.equals("log ID should match", detailedLog.id, logId);
  TestValidator.predicate(
    "log should have action type",
    detailedLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "log should have action description",
    detailedLog.action_description.length > 0,
  );
  TestValidator.predicate(
    "log should have moderator",
    detailedLog.moderator.id.length > 0,
  );
  TestValidator.predicate(
    "log should have community",
    detailedLog.community.id.length > 0,
  );
  TestValidator.predicate(
    "log should have creation timestamp",
    detailedLog.created_at.length > 0,
  );
}
