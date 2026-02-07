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

export async function test_api_system_message_creation_with_immediate_publish(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Create system message with immediate publication
  const systemMessage =
    await api.functional.community.admin.system_messages.create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          published_at: new Date().toISOString(),
          status: "published" as const,
        } satisfies ICommunitySystemMessage.ICreate,
      },
    );
  typia.assert(systemMessage);
  // 3. Validation: Ensure published_at is set to current timestamp
  const now = new Date();
  const publishedAt = new Date(systemMessage.published_at);
  TestValidator.predicate("published_at is current timestamp", () => {
    const diffMs = Math.abs(publishedAt.getTime() - now.getTime());
    return diffMs < 1000; // Within 1 second of current time
  });
  // 4. Validation: Ensure status is published
  TestValidator.equals(
    "status is published",
    systemMessage.status,
    "published",
  );
  // 5. Validation: Ensure visible_until is null (indefinite visibility)
  TestValidator.equals(
    "visible_until is null",
    systemMessage.visible_until,
    null,
  );
}
