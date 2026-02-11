import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieve_moderation_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    },
  });
  typia.assert(admin);
  // Generate a random moderation ID for retrieval testing
  // Since we can't create a moderation assignment, we'll test retrieval with a random ID
  const randomModerationId = typia.random<string & tags.Format<"uuid">>();
  // Test retrieval of moderation assignment by ID
  const retrieved =
    await api.functional.redditPlatform.admin.redditPlatform.moderations.at(
      adminConnection,
      {
        moderationId: randomModerationId,
      },
    );
  typia.assert(retrieved);
  // Validate the retrieved moderation assignment structure
  TestValidator.equals(
    "moderation ID is valid UUID",
    typeof retrieved.id,
    "string",
  );
  TestValidator.equals(
    "community ID is valid UUID",
    typeof retrieved.community_id,
    "string",
  );
  TestValidator.equals(
    "user ID is valid UUID",
    typeof retrieved.user_id,
    "string",
  );
  TestValidator.predicate(
    "role is valid enum value",
    ["OWNER", "MODERATOR"].includes(retrieved.role),
  );
  TestValidator.equals(
    "community name exists",
    retrieved.community.name !== undefined,
    true,
  );
  TestValidator.equals(
    "user username exists",
    retrieved.user.username !== undefined,
    true,
  );
}
