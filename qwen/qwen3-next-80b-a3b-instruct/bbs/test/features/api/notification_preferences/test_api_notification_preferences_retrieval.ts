import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreferences";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_preferences_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as citizen user
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authResult);
  // Retrieve notification preferences using the same connection that was updated by authorize_member_join
  const preferences =
    await api.functional.discussionBoard.dashboard.users.notification_preferences.at(
      memberConnection,
      {
        userId: authResult.id,
      },
    );
  typia.assert(preferences);
}
