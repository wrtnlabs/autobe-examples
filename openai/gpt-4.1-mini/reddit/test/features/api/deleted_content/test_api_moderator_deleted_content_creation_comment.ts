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

export async function test_api_moderator_deleted_content_creation_comment(
  connection: api.IConnection,
) {
  // 1. Moderator join and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinPayload: ICommunityPlatformModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: `https://example.com/avatars/${RandomGenerator.alphabets(10)}.png`,
  };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    { body: moderatorJoinPayload },
  );
  // Update connection headers with token
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 2. Create a deleted comment record by generating realistic test data
  //    Use generation function instead of direct API call
  const deletedContent =
    await generate_random_community_platform_moderator_deleted_contents_create_deleted_content(
      moderatorConnection,
      {
        body: {
          moderator_id: moderatorAuthorized.id,
          user_id: typia.random<string & tags.Format<"uuid">>(),
          post_id: null,
          comment_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(deletedContent);
  // 3. Assertions on creation record
  //    - Exactly one of post_id or comment_id must be non-null. Here post_id is null, comment_id is non-null.
  //    - Include moderator_id and user_id match input
  //    - reason matches
  //    - timestamps exist and are valid ISO date strings
  //    - relation summaries for moderator and user exist
  TestValidator.equals(
    "moderator_id matches input",
    deletedContent.moderator_id,
    moderatorAuthorized.id,
  );
  TestValidator.predicate(
    "comment_id is provided and post_id is null",
    deletedContent.comment_id !== null && deletedContent.post_id === null,
  );
  TestValidator.equals(
    "reason is respected",
    deletedContent.reason,
    deletedContent.reason,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(deletedContent.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(Date.parse(deletedContent.updated_at)),
  );
  // 4. Relation summaries should be present (not undefined/null)
  TestValidator.predicate(
    "moderator summary exists",
    deletedContent.moderator !== undefined && deletedContent.moderator !== null,
  );
  TestValidator.predicate(
    "user summary exists",
    deletedContent.user !== undefined && deletedContent.user !== null,
  );
  // 5. The deleted comment relation summary must be valid (not null)
  TestValidator.predicate(
    "comment summary exists",
    deletedContent.comment !== null,
  );
  TestValidator.equals("post summary is null", deletedContent.post, null);
}
