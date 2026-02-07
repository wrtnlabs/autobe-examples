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

export async function test_api_system_message_archive_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Use a generated UUID to represent an existing published system message
  // Since no create endpoint exists in available APIs, we assume an existing message
  const messageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Archive the message
  const archivedMessage =
    await api.functional.community.admin.system_messages.update(
      adminConnection,
      {
        messageId,
        body: {
          id: messageId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          published_at: new Date().toISOString(),
          visible_until: null,
          status: "archived" as const,
        } satisfies ICommunitySystemMessage,
      },
    );
  typia.assert(archivedMessage);
  // 4. Validate archive results
  TestValidator.equals(
    "status should be archived",
    archivedMessage.status,
    "archived",
  );
  TestValidator.notEquals(
    "updated_at should be different",
    archivedMessage.updated_at,
    archivedMessage.created_at,
  );
  TestValidator.equals(
    "visible_until should remain unchanged",
    archivedMessage.visible_until,
    null,
  );
}