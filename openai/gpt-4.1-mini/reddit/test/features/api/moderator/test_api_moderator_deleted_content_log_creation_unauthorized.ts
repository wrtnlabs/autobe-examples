import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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

export async function test_api_moderator_deleted_content_log_creation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to create a deleted content log entry without moderator authorization
  // so it should fail with authorization error.
  // Create a new connection without authorization header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Prepare a dummy body payload for createDeletedContent - but DTO ICreate is empty. We only have {} as type.
  // So we try to call with empty object {}
  const body = {} satisfies ICommunityPlatformDeletedContent.ICreate;
  // Expect api.functional.communityPlatform.moderator.deletedContents.createDeletedContent to throw authorization error
  await TestValidator.httpError(
    "create deleted content unauthorized",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.deletedContents.createDeletedContent(
        unauthorizedConnection,
        { body },
      );
    },
  );
}
