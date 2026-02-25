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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_deleted_contents_create_deleted_content } from "../../../generate/generate_random_community_platform_moderator_deleted_contents_create_deleted_content";
import { prepare_random_community_platform_deleted_content } from "../../../prepare/prepare_random_community_platform_deleted_content";

export async function test_api_deleted_content_update_reason_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create connections for moderator and user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 2. Moderator join
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `moderator${RandomGenerator.alphabets(5)}@test.com`,
      username: `moderator_${RandomGenerator.name(1)}`,
      displayName: `Mod ${RandomGenerator.name(1)}`,
      bio: `Bio ${RandomGenerator.paragraph({ sentences: 1 })}`,
      avatarUrl: null,
    },
  });
  typia.assert(moderator);
  // 3. User join
  const user = await authorize_user_join(userConnection, {
    body: {
      email: `user${RandomGenerator.alphabets(5)}@test.com`,
      username: `user_${RandomGenerator.name(1)}`,
      displayName: `User ${RandomGenerator.name(1)}`,
    },
  });
  typia.assert(user);
  // 4. Moderator creates a deleted content record
  const deletedContent =
    await generate_random_community_platform_moderator_deleted_contents_create_deleted_content(
      moderatorConnection,
      {
        body: {
          moderator_id: moderator.id,
          user_id: user.id,
          reason: "Initial deletion reason",
          post_id: null,
          comment_id: null,
        },
      },
    );
  typia.assert(deletedContent);
  // 5. User attempts to update the deleted content's reason
  const updateBody: ICommunityPlatformDeletedContent.IUpdate = {
    reason: "Updated reason by unauthorized user",
  };
  // 6. Assert that user is forbidden from updating
  await TestValidator.httpError(
    "access denied to update deleted content reason for non-moderator",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.deleted_contents.updateDeletedContent(
        userConnection,
        {
          id: deletedContent.id,
          body: updateBody,
        },
      );
    },
  );
}
