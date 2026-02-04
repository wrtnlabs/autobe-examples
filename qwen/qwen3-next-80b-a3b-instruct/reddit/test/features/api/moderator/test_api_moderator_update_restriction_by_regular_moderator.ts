import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_update_restriction_by_regular_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first moderator (the one attempting unauthorized changes)
  const regularModeratorConnection: api.IConnection = { host: connection.host };
  const regularModerator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(regularModeratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  // Step 2: Create second moderator (the target whose permissions will be updated)
  const targetModeratorConnection: api.IConnection = { host: connection.host };
  const targetModerator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(targetModeratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  // Step 3: Attempt to update target moderator's permissions using regular moderator's connection
  // This should fail with 403 Forbidden error as regular moderator cannot update another moderator
  await TestValidator.error(
    "regular moderator cannot update another moderator's permissions",
    async () => {
      await api.functional.communityPlatform.moderator.moderators.update(
        regularModeratorConnection,
        {
          moderatorId: targetModerator.id,
          body: {
            permissions: {
              can_delete_posts: true,
              can_delete_comments: true,
              can_ban_users: true,
            },
          } satisfies ICommunityPlatformModerator.IUpdate,
        },
      );
    },
  );
}
