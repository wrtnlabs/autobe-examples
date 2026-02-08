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

export async function test_api_moderator_deleted_content_log_creation_with_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authorization via join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create deleted content log with empty body as per schema
  const deletedContent =
    await generate_random_community_platform_moderator_deleted_contents_create_deleted_content(
      moderatorConnection,
      { body: {} },
    );
  // 3. Assert and validate returned deleted content log
  typia.assert(deletedContent);
}
