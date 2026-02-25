import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_profile_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_platform_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(joined);
  // 2. Retrieve platform admin profile using the same connection with auth token
  const profile =
    await api.functional.redditCommunity.platformAdmin.platform_admins.at(
      joinConnection,
      {
        platformAdminId: joined.id,
      },
    );
  typia.assert(profile);
  // 3. Validate all required fields
  TestValidator.equals("profile ID matches", profile.id, joined.id);
  TestValidator.equals(
    "profile username matches",
    profile.username,
    joined.username,
  );
  TestValidator.equals(
    "profile karma_score matches",
    profile.karma_score,
    joined.karma_score,
  );
  TestValidator.equals(
    "profile created_at matches",
    profile.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches",
    profile.updated_at,
    joined.updated_at,
  );
  // Validate optional fields are null or match expected type (typia.assert already validates type)
  TestValidator.equals(
    "display_name consistency",
    profile.display_name,
    joined.display_name,
  );
  TestValidator.equals("bio consistency", profile.bio, joined.bio);
  // Validate avatar_url is null or valid HTTP/HTTPS URI format using typia.assert (format tag handles validation)
  if (profile.avatar_url !== null && profile.avatar_url !== undefined) {
    const asUri = profile.avatar_url satisfies string & tags.Format<"uri">;
    typia.assert(asUri); // Valid URI format validation
  }
}