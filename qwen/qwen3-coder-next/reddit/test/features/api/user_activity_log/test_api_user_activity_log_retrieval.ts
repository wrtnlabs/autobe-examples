import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_activity_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test data - regular user joins
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  typia.assert(userConnection);
  // 2. Admin creates an activity log entry
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.ILogin>(),
  });
  // 3. User retrieves their own activity log
  const log = await api.functional.redditPlatform.user_activity_logs.at(
    userConnection,
    {
      logId: typia.random<string>(),
    },
  );
  typia.assert(log);
  // 4. Moderator retrieves activity log
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.ILogin>(),
  });
  const modLog = await api.functional.redditPlatform.user_activity_logs.at(
    moderatorConnection,
    {
      logId: typia.random<string>(),
    },
  );
  typia.assert(modLog);
  // 5. Admin retrieves any activity log
  const adminRetrievedLog =
    await api.functional.redditPlatform.user_activity_logs.at(adminConnection, {
      logId: typia.random<string>(),
    });
  typia.assert(adminRetrievedLog);
  // 6. Test invalid log ID (404 error)
  await TestValidator.error("invalid log ID returns 404", async () => {
    await api.functional.redditPlatform.user_activity_logs.at(userConnection, {
      logId: "invalid-uuid-format",
    });
  });
}
