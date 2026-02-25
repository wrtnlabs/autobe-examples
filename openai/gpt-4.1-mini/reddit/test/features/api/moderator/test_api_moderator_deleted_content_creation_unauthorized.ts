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

export async function test_api_moderator_deleted_content_creation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test attempt to create a deletion record without authentication.
  // Expect the API to reject the request with an authorization error.
  // Use base connection without moderator authorization
  const baseConnection: api.IConnection = { host: connection.host };
  // Prepare a random deletion content payload with dummy UUIDs and reason
  const deletionPayload: ICommunityPlatformDeletedContent.ICreate = {
    moderator_id: typia.random<string & tags.Format<"uuid">>(),
    user_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Unauthorized deletion attempt",
    // Simulate post_id only, no comment_id
    post_id: typia.random<string & tags.Format<"uuid">>(),
    comment_id: null,
  };
  // Attempt to create the deletion record without authentication
  await TestValidator.error(
    "should reject unauthorized deletion record creation",
    async () => {
      await api.functional.communityPlatform.moderator.deleted_contents.createDeletedContent(
        baseConnection,
        { body: deletionPayload },
      );
    },
  );
}
