import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_community_statistics_public_access_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection (no authentication) - no admin setup needed
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random valid UUID for community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Perform public access request without authentication
  const publicResult =
    await api.functional.redditCommunity.platformAdmin.communities.at(
      guestConnection,
      {
        id: communityId,
      },
    );
  typia.assert(publicResult);
  // Validate structure matches ISummary - no equality check with admin data since no admin interaction needed
  TestValidator.predicate("has valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      publicResult.id,
    ),
  );
  TestValidator.predicate(
    "has string name",
    () => typeof publicResult.name === "string",
  );
  TestValidator.predicate(
    "has string or null description",
    () =>
      publicResult.description === null ||
      typeof publicResult.description === "string",
  );
  TestValidator.predicate(
    "has string or null icon_url",
    () =>
      publicResult.icon_url === null ||
      typeof publicResult.icon_url === "string",
  );
  TestValidator.predicate(
    "has non-negative subscriber_count",
    () => publicResult.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "has valid datetime format",
    () => !isNaN(Date.parse(publicResult.created_at)),
  );
}
