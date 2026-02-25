import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_vote_rate_limit_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  // Generate a random UUID for the rate limit record
  const rateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the vote rate limit record
  const rateLimitRecord =
    await api.functional.communityPlatform.admin.vote_rate_limits.at(
      adminConnection,
      { rateLimitId },
    );
  // Validate the complete response structure - this validates ALL properties including types, formats, and constraints
  typia.assert(rateLimitRecord);
  // Validate business logic - entity type and vote type are valid enum values
  TestValidator.predicate(
    "entity type is valid",
    rateLimitRecord.entity_type === "post" ||
      rateLimitRecord.entity_type === "comment",
  );
  TestValidator.predicate(
    "vote type is valid",
    rateLimitRecord.vote_type === "upvote" ||
      rateLimitRecord.vote_type === "downvote",
  );
  // Validate record ID matches the requested ID
  TestValidator.equals("record ID matches", rateLimitRecord.id, rateLimitId);
}
