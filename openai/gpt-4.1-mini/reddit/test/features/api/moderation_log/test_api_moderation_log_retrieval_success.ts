import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and authentication
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const joinInput: ICommunityPlatformModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
  };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorJoinConnection, {
      body: joinInput,
    });
  // Use new connection with authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // 2. Generate random valid UUID for test
  const moderationLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the moderation log using the moderator connection
  const moderationLog =
    await api.functional.communityPlatform.moderator.moderationLogs.at(
      moderatorConnection,
      { moderationLogId },
    );
  typia.assert(moderationLog);
  // 4. Validate key properties of moderation log response
  TestValidator.predicate(
    "moderation log id is valid UUID",
    /^[0-9a-fA-F-]{36}$/.test(moderationLog.id),
  );
  TestValidator.predicate(
    "moderation log actionType is not empty",
    moderationLog.actionType.length > 0,
  );
  TestValidator.equals(
    "moderation log id equals requested",
    moderationLog.id,
    moderationLogId,
  );
  TestValidator.predicate(
    "moderation log createdAt is ISO date",
    !isNaN(Date.parse(moderationLog.createdAt)),
  );
  TestValidator.predicate(
    "moderation log updatedAt is ISO date",
    !isNaN(Date.parse(moderationLog.updatedAt)),
  );
  // 5. Validate moderator summary (cannot have detailed spec, so just existence check)
  TestValidator.predicate(
    "moderation log moderator present",
    moderationLog.moderator !== null && moderationLog.moderator !== undefined,
  );
  // 6. Optional linked post and comment, if present, validate id format
  if (moderationLog.post) {
    TestValidator.predicate(
      "moderation log post id is valid UUID",
      /^[0-9a-fA-F-]{36}$/.test(moderationLog.post.id),
    );
  }
  if (moderationLog.comment) {
    TestValidator.predicate(
      "moderation log comment id is valid UUID",
      /^[0-9a-fA-F-]{36}$/.test(moderationLog.comment.id),
    );
  }
  // 7. Validate actionDetails nullable
  // Nullable string, no validation needed
  // 8. Validate deletedAt nullable and ISO timestamp if present
  if (
    moderationLog.deletedAt !== null &&
    moderationLog.deletedAt !== undefined
  ) {
    TestValidator.predicate(
      "moderation log deletedAt is ISO date",
      !isNaN(Date.parse(moderationLog.deletedAt)),
    );
  }
}
