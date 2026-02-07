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

export async function test_api_system_message_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration to establish admin session
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(joinResponse);
  // 2. Admin creates a permanent system message (visible_until=null)
  const systemMessage =
    await generate_random_community_admin_system_messages_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          published_at: new Date().toISOString(),
          visible_until: null,
          status: "published" as const,
        } satisfies ICommunitySystemMessage.ICreate,
      },
    );
  typia.assert(systemMessage);
  const messageId = systemMessage.id;
  // 3. Admin retrieves the created system message by ID
  const retrievedMessage =
    await api.functional.community.admin.system_messages.at(adminConnection, {
      messageId,
    });
  typia.assert(retrievedMessage);
  // 4. Validate retrieved message matches created message
  TestValidator.equals("message ID matches", retrievedMessage.id, messageId);
  TestValidator.equals(
    "title matches",
    retrievedMessage.title,
    systemMessage.title,
  );
  TestValidator.equals(
    "content matches",
    retrievedMessage.content,
    systemMessage.content,
  );
  TestValidator.equals(
    "published_at matches",
    retrievedMessage.published_at,
    systemMessage.published_at,
  );
  TestValidator.equals(
    "visible_until is null",
    retrievedMessage.visible_until,
    null,
  );
  TestValidator.equals(
    "status matches",
    retrievedMessage.status,
    systemMessage.status,
  );
  TestValidator.predicate("created_at is ISO date-time", () => {
    const date = new Date(retrievedMessage.created_at);
    return (
      !isNaN(date.getTime()) &&
      !!(date.toISOString() === retrievedMessage.created_at)
    );
  });
  TestValidator.predicate("updated_at is ISO date-time", () => {
    const date = new Date(retrievedMessage.updated_at);
    return (
      !isNaN(date.getTime()) &&
      !!(date.toISOString() === retrievedMessage.updated_at)
    );
  });
}
