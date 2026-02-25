import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
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
import { generate_random_community_platform_moderator_deleted_contents_create_deleted_content } from "../../../generate/generate_random_community_platform_moderator_deleted_contents_create_deleted_content";
import { prepare_random_community_platform_deleted_content } from "../../../prepare/prepare_random_community_platform_deleted_content";

export async function test_api_deleted_content_update_reason_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join & authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    },
  });
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create a deleted content record as the newly appointed moderator
  // We must provide moderator_id, user_id, and either post_id or comment_id (not both)
  const deletedContent =
    await generate_random_community_platform_moderator_deleted_contents_create_deleted_content(
      moderatorConnection,
      {
        body: {
          moderator_id: moderatorAuth.id,
          user_id: typia.random<string & tags.Format<"uuid">>(),
          post_id: typia.random<string & tags.Format<"uuid">>(),
          comment_id: null,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(deletedContent);
  // 3. Prepare update reason
  const updatedReason = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody: ICommunityPlatformDeletedContent.IUpdate = {
    reason: updatedReason,
  };
  // 4. Perform update operation
  const updatedDeletedContent =
    await api.functional.communityPlatform.moderator.deleted_contents.updateDeletedContent(
      moderatorConnection,
      { id: deletedContent.id, body: updateBody },
    );
  typia.assert(updatedDeletedContent);
  // 5. Assertions
  TestValidator.equals(
    "deleted content id unchanged",
    updatedDeletedContent.id,
    deletedContent.id,
  );
  TestValidator.equals(
    "moderator id unchanged",
    updatedDeletedContent.moderator_id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "reason updated",
    updatedDeletedContent.reason,
    updatedReason,
  );
  // 6. Validate timestamps presence and iso strings
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof updatedDeletedContent.created_at === "string" &&
      Boolean(updatedDeletedContent.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof updatedDeletedContent.updated_at === "string" &&
      Boolean(updatedDeletedContent.updated_at),
  );
  // 7. Nullable deleted_at
  if (
    updatedDeletedContent.deleted_at !== null &&
    updatedDeletedContent.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is valid ISO string",
      typeof updatedDeletedContent.deleted_at === "string" &&
        Boolean(updatedDeletedContent.deleted_at),
    );
  }
  // 8. Relations are present (moderator, user, both post and comment exist but can be null)
  TestValidator.predicate(
    "moderator relation exists",
    updatedDeletedContent.moderator !== undefined &&
      updatedDeletedContent.moderator !== null,
  );
  TestValidator.predicate(
    "user relation exists",
    updatedDeletedContent.user !== undefined &&
      updatedDeletedContent.user !== null,
  );
  TestValidator.predicate(
    "post relation exists (can be null)",
    updatedDeletedContent.post !== undefined,
  );
  TestValidator.predicate(
    "comment relation exists (can be null)",
    updatedDeletedContent.comment !== undefined,
  );
}
