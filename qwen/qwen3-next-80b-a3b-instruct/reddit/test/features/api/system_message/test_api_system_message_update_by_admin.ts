import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_message_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin using utility function (IJoin is empty, so pass {})
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // Generate a random UUID for messageId (since we cannot create a message, we must use a random one)
  const messageId = typia.random<string & tags.Format<"uuid">>();
  // Update the system message with empty body per IUpdate definition (which is {})
  const updatedMessage =
    await api.functional.community.admin.system_messages.update(
      adminConnection,
      {
        messageId,
        body: {},
      },
    );
  typia.assert(updatedMessage);
  // Since IUpdate is empty ({}) and no business properties can be updated, we cannot validate any business logic
  // The only possible validation is that the response is of type ICommunitySystemMessage
  // The scenario's business requirements (status update, publish_at, etc.) are impossible to test due to DTO constraints
  // This test verifies only compilation and endpoint accessibility under the impossible DTO definitions
}
