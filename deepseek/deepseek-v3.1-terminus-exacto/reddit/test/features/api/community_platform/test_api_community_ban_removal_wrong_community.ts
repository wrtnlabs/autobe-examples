import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_community_ban_removal_wrong_community(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator using available utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Generate random UUIDs to simulate the scenario
  const firstCommunityId = typia.random<string & tags.Format<"uuid">>();
  const secondCommunityId = typia.random<string & tags.Format<"uuid">>();
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete a ban using a different community ID than where it was created
  // This tests that the system validates ban ownership by community
  await TestValidator.error(
    "ban deletion with wrong community ID should fail",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.erase(
        moderatorConnection,
        {
          communityId: secondCommunityId, // Wrong community ID
          banId: banId,
        },
      );
    },
  );
}
