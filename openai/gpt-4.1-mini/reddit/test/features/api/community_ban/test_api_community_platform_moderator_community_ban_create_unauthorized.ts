import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_moderator_community_bans_create } from "../../../generate/generate_random_community_platform_moderator_community_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_platform_moderator_community_ban_create_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // This test verifies that creating a community ban without moderator authorization
  // is forbidden by the system. It tries to call the ban creation endpoint immediately
  // with the base connection (no auth headers), expecting HTTP 401 or 403 errors.
  // Use a body with an empty object as ICommunityPlatformCommunityBan.ICreate has no properties,
  // avoiding type errors and focusing on authorization.
  await TestValidator.httpError(
    "unauthorized community ban creation",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.community_bans.create(
        connection,
        {
          body: {}, // ICommunityPlatformCommunityBan.ICreate has no defined properties
        },
      );
    },
  );
}
