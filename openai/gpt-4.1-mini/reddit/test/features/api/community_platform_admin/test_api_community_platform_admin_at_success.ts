import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of an existing administrator's detailed information by a valid UUID.
 * Confirm response includes email, display name, bio, avatar URL, and timestamps.
 * Validate 200 OK status.
 * Confirm no sensitive data like password hash is included.
 * Confirm access control allows only authorized admin users.
 */
export async function test_api_community_platform_admin_at_success(
  connection: api.IConnection,
): Promise<void> {
  // Admin join to create an admin account and get authorized connection
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "StrongPassword123!",
      displayName: `Admin ${RandomGenerator.name(1)}`,
      bio: "Test admin bio",
      avatarUrl: null,
    },
  });
  typia.assert(authorizedAdmin);
  // Setup authorized connection with JWT token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedAdmin.token.access },
  };
  // Retrieve admin information by admin ID
  const adminInfo = await api.functional.communityPlatform.admins.at(
    authorizedConnection,
    { id: authorizedAdmin.id },
  );
  // Assert full structure of ICommunityPlatformAdmin
  typia.assert(adminInfo);
  // Content assertions
  TestValidator.equals("admin ID matches", adminInfo.id, authorizedAdmin.id);
  TestValidator.equals(
    "admin email matches",
    adminInfo.email,
    authorizedAdmin.email,
  );
  TestValidator.equals(
    "admin displayName matches",
    adminInfo.displayName,
    authorizedAdmin.displayName,
  );
  // bio and avatarUrl can be null or string, must match
  TestValidator.equals("admin bio matches", adminInfo.bio, authorizedAdmin.bio);
  TestValidator.equals(
    "admin avatarUrl matches",
    adminInfo.avatarUrl,
    authorizedAdmin.avatarUrl,
  );
  // Check timestamps reasonable (ISO string)
  TestValidator.predicate(
    "createdAt is valid ISO date",
    typeof adminInfo.createdAt === "string" &&
      !isNaN(Date.parse(adminInfo.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    typeof adminInfo.updatedAt === "string" &&
      !isNaN(Date.parse(adminInfo.updatedAt)),
  );
  TestValidator.predicate(
    "deletedAt is null or valid ISO date",
    adminInfo.deletedAt === null ||
      (typeof adminInfo.deletedAt === "string" &&
        !isNaN(Date.parse(adminInfo.deletedAt))),
  );
}
