import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

export async function test_api_admin_user_detail_reflects_updated_profile_state(
  connection: api.IConnection,
) {
  // 1. Prepare join request body with realistic, type-safe values
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const body = {
    email,
    password,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href,
    referrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  // 2. Join as adminUser to create account and obtain authorized session
  const authorized = await api.functional.auth.adminUser.join(connection, {
    body,
  });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(authorized);

  // 3. Fetch admin profile detail using returned adminUser id
  const detail = await api.functional.discussionBoard.adminUser.adminUsers.at(
    connection,
    {
      adminUserId: authorized.id,
    },
  );
  typia.assert<IDiscussionBoardAdminuser>(detail);

  // 4. Basic identity and profile field consistency
  TestValidator.equals(
    "adminUser id of detail matches join response",
    detail.id,
    authorized.id,
  );
  TestValidator.equals(
    "displayName matches between auth snapshot and detail profile",
    detail.displayName,
    authorized.displayName,
  );
  TestValidator.equals(
    "email matches between auth snapshot and detail profile",
    detail.email,
    authorized.email,
  );
  TestValidator.equals(
    "emailVerified flag matches between auth snapshot and detail profile",
    detail.emailVerified,
    authorized.emailVerified,
  );
  TestValidator.equals(
    "accountStatus matches status field from authorized snapshot",
    detail.accountStatus,
    authorized.status,
  );

  // 5. Timestamp consistency: createdAt <= updatedAt
  const createdAtDate = new Date(detail.createdAt);
  const updatedAtDate = new Date(detail.updatedAt);

  TestValidator.predicate(
    "createdAt is a valid date",
    !Number.isNaN(createdAtDate.getTime()),
  );
  TestValidator.predicate(
    "updatedAt is a valid date",
    !Number.isNaN(updatedAtDate.getTime()),
  );
  TestValidator.predicate(
    "updatedAt is not earlier than createdAt",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  // 6. Optional lastLoginAt consistency (if present)
  if (detail.lastLoginAt !== null && detail.lastLoginAt !== undefined) {
    const lastLoginAtDate = new Date(detail.lastLoginAt);

    TestValidator.predicate(
      "lastLoginAt is a valid date when present",
      !Number.isNaN(lastLoginAtDate.getTime()),
    );
    TestValidator.predicate(
      "lastLoginAt is not earlier than createdAt when present",
      lastLoginAtDate.getTime() >= createdAtDate.getTime(),
    );
  }
}
