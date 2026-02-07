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

export async function test_api_system_message_creation_with_scheduled_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate scheduled system message
  const futureNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const visibleUntil = new Date(futureNow.getTime() + 7 * 24 * 60 * 60 * 1000);
  const message = await generate_random_community_admin_system_messages_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        published_at: futureNow.toISOString(),
        visible_until: visibleUntil.toISOString(),
        status: "draft",
      },
    },
  );
  // 3. Validate response structure and fields
  typia.assert(message);
  // 4. Validate business logic
  TestValidator.equals("status is draft", message.status, "draft");
  TestValidator.equals(
    "published_at is 24 hours in future",
    message.published_at,
    futureNow.toISOString(),
  );
  TestValidator.equals(
    "visible_until is 7 days after published_at",
    message.visible_until,
    visibleUntil.toISOString(),
  );
}
