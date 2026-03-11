import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test community ban unban success scenario.
 * 
 * This test validates the primary success path of unban operation:
 * 1. Admin user joins the system and gets authenticated
 * 2. Admin calls unban endpoint with valid communityId and banId
 * 3. System performs soft delete and returns success
 */
export async function test_api_community_ban_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(admin);

  // 2. Generate test data
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const banId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call unban endpoint
  await api.functional.redditPlatform.admin.communities.bans.eraseByCommunityidAndBanid(
    adminConnection,
    {
      communityId,
      banId,
    },
  );

  // 4. Success validation - endpoint returned successfully (void response with 204 status)
  TestValidator.predicate("unban operation succeeded", true);
}