import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  // Generate valid test data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = email.split("@")[0];
  // Execute join operation using utility function
  const response = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email,
        password,
        display_name: displayName,
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  // Validate response structure
  typia.assert(response);
  // Verify token structure
  const token = response.token;
  typia.assert(token);
  // Verify refresh token exists and is a non-empty string
  TestValidator.predicate("refresh token should be a non-empty string", () => {
    return typeof token.refresh === "string" && token.refresh.length > 0;
  });
  // Verify expiration timestamps are valid date-time strings
  TestValidator.predicate("expired_at should be valid date-time", () => {
    return (
      typeof token.expired_at === "string" &&
      !isNaN(Date.parse(token.expired_at))
    );
  });
  TestValidator.predicate("refreshable_until should be valid date-time", () => {
    return (
      typeof token.refreshable_until === "string" &&
      !isNaN(Date.parse(token.refreshable_until))
    );
  });
  // Verify token expiration times are in the future
  const now = new Date().getTime();
  TestValidator.predicate("expired_at should be in the future", () => {
    return Date.parse(token.expired_at) > now;
  });
  TestValidator.predicate("refreshable_until should be in the future", () => {
    return Date.parse(token.refreshable_until) > now;
  });
  // Verify expired_at is before refreshable_until (access token expires sooner)
  TestValidator.predicate(
    "expired_at should be before refreshable_until",
    () => {
      return Date.parse(token.expired_at) < Date.parse(token.refreshable_until);
    },
  );
}
