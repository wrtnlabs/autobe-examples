import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_moderator_listing_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session for accessing member-only endpoints
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Access moderators endpoint for a community with no moderators
  // Using a generated community name that represents a new community without moderators
  const communityName = RandomGenerator.alphaNumeric(10);
  // 3. Call the moderators listing endpoint
  // The endpoint should return successfully (HTTP 200) even when no moderators exist
  // It should return an empty array rather than 404 (community not found)
  const moderators =
    await api.functional.redditPlatform.member.communities.moderators.search(
      memberConnection,
      { communityName },
    );
  // 4. Validate response type matches the moderator DTO structure
  typia.assert(moderators);
  // 5. Verify the moderators response is an empty array
  // This confirms communities without moderators return empty list, not error
  TestValidator.equals(
    "moderators list is empty for new community",
    Array.isArray(moderators) ? moderators.length : 0,
    0,
  );
  // 6. Confirm the response structure is an array, not null or object
  TestValidator.predicate("moderators response is array type", () =>
    Array.isArray(moderators),
  );
}
