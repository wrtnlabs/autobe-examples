import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFlag";
import { prepare_random_community_platform_flag } from "../../../prepare/prepare_random_community_platform_flag";
import { generate_random_community_platform_admin_flags_create } from "../../../generate/generate_random_community_platform_admin_flags_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_flag_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const joinData: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/",
    ip: null,
  };
  const authorizedAdmin: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: joinData });
  // Step 2: Create flag data with properly generated values
  const flagData: ICommunityPlatformFlag.ICreate = {
    name: typia.random<string & tags.MinLength<1> & tags.MaxLength<100>>(),
    value: true,
    description: typia.random<string & tags.MaxLength<500>>(),
  };
  // Step 3: Create flag using admin connection
  const createdFlag: ICommunityPlatformFlag =
    await api.functional.communityPlatform.admin.flags.create(adminConnection, {
      body: flagData satisfies ICommunityPlatformFlag.ICreate,
    });
  typia.assert(createdFlag);
  // Step 4: Validate flag creation - only validate what actually exists
  TestValidator.equals(
    "flag value matches",
    createdFlag.enabled,
    flagData.value,
  );
}
