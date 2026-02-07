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

export async function test_api_system_message_creation_with_valid_status_transition_to_archived(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Create system message with valid 'draft' status
  const message = await api.functional.community.admin.system_messages.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        published_at: new Date().toISOString(),
        visible_until: null,
        status: "draft",
      } satisfies ICommunitySystemMessage.ICreate,
    },
  );
  typia.assert(message);
  // 3. Validate response
  TestValidator.equals("status is draft", message.status, "draft");
  TestValidator.equals("visible_until is null", message.visible_until, null);
}
