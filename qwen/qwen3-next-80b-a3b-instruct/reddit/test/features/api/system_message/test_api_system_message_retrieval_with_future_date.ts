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
import { generate_random_community_admin_system_messages_create } from "../../../generate/generate_random_community_admin_system_messages_create";
import { prepare_random_community_system_message } from "../../../prepare/prepare_random_community_system_message";

export async function test_api_system_message_retrieval_with_future_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Create system message with future publication date
  const futureDate = new Date(new Date().getTime() + 3600000).toISOString(); // 1 hour in future
  const systemMessage =
    await generate_random_community_admin_system_messages_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          published_at: futureDate,
          visible_until: null,
          status: "published" as const,
        },
      },
    );
  typia.assert(systemMessage);
  // 3. Attempt to retrieve the message by ID - should return 404 (not visible yet)
  await TestValidator.httpError(
    "message not yet visible should return 404",
    404,
    async () => {
      await api.functional.community.admin.system_messages.at(adminConnection, {
        messageId: systemMessage.id,
      });
    },
  );
}
