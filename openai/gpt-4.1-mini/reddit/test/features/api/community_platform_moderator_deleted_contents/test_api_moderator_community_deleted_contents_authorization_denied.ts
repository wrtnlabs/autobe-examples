import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_community_deleted_contents_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Normal user connection (unauthorized as moderator)
  const normalUserConnection: api.IConnection = { host: connection.host };
  // We'll try calling the deleted contents API with a random communityId
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 2. Guest user connection (unauthenticated)
  const guestConnection: api.IConnection = { host: connection.host };
  // Attempt accessing deleted contents with normal user connection should fail.
  await TestValidator.httpError("normal user access denied", 403, async () => {
    await api.functional.communityPlatform.moderator.communities.deleted_contents.index(
      normalUserConnection,
      { communityId: randomCommunityId },
    );
  });
  // Attempt accessing deleted contents with guest connection should fail.
  await TestValidator.httpError("guest user access denied", 401, async () => {
    await api.functional.communityPlatform.moderator.communities.deleted_contents.index(
      guestConnection,
      { communityId: randomCommunityId },
    );
  });
}
