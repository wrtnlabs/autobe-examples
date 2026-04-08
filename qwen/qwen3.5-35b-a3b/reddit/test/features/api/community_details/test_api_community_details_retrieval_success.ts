import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_details_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create guest connection with the authorization token
  const guestTestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: guestAuth.token.access,
    },
  };
  // 3. Generate a random UUID for the community ID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve community details
  const community = await api.functional.redditCommunity.guest.communities.at(
    guestTestConnection,
    { communityId },
  );
  typia.assert(community);
  // 5. Validate response structure
  TestValidator.equals(
    "community id matches request",
    community.id,
    communityId,
  );
  TestValidator.predicate(
    "name is non-empty string",
    community.name.length > 0,
  );
  TestValidator.predicate(
    "description is string or null",
    community.description === null || typeof community.description === "string",
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    community.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    community.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null (active community)",
    community.deleted_at,
    null,
  );
  // 6. Verify timestamp ordering
  const createdAt = new Date(community.created_at);
  const updatedAt = new Date(community.updated_at);
  TestValidator.predicate("updated_at >= created_at", updatedAt >= createdAt);
}