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

export async function test_api_admin_profile_self_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account using utility function
  const adminCreateConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminCreateConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection with token from registration
  const adminProfileConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };
  // 3. Retrieve admin's own profile using adminId from registration
  const profile = await api.functional.redditPlatform.admin.admins.at(
    adminProfileConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(profile);
  // 4. Validate profile fields match registration data
  TestValidator.equals(
    "email matches registration",
    profile.email,
    adminAuth.email,
  );
  TestValidator.equals(
    "username matches registration",
    profile.username,
    adminAuth.username,
  );
  TestValidator.equals(
    "display_name matches registration",
    profile.display_name,
    adminAuth.display_name,
  );
  TestValidator.equals(
    "is_active is true",
    profile.is_active,
    adminAuth.is_active,
  );
  TestValidator.equals("bio matches registration", profile.bio, adminAuth.bio);
  TestValidator.equals(
    "avatar_url matches registration",
    profile.avatar_url,
    adminAuth.avatar_url,
  );
  // 5. Validate timestamps are properly formatted
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    () => !Number.isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    () => !Number.isNaN(Date.parse(profile.updated_at)),
  );
}
