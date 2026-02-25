import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_vote_karma_impact_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as moderator using utility function and get authorized connection
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
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
    },
  );
  // Create authenticated connection with the token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorizedModerator.token.access,
    },
  };
  // Generate a random UUID that doesn't exist in the database
  const nonExistentKarmaImpactId = typia.random<string & tags.Format<"uuid">>();
  // Test that the endpoint returns 404 for non-existent karma impact record
  await TestValidator.httpError(
    "should return 404 for non-existent karma impact ID",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.vote_karma_impacts.at(
        authenticatedConnection,
        {
          karmaImpactId: nonExistentKarmaImpactId,
        },
      );
    },
  );
}
