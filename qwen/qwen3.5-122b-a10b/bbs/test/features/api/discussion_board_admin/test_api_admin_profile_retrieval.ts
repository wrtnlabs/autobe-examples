import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve admin profile using the authenticated connection
  const profile =
    await api.functional.discussionBoard.admin.profile.at(adminConnection);
  typia.assert(profile);
  // 3. Validate profile structure and content
  TestValidator.equals("profile ID matches admin ID", profile.id, adminAuth.id);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    adminAuth.display_name,
  );
  TestValidator.predicate(
    "bio is string or null",
    profile.bio === null || typeof profile.bio === "string",
  );
  TestValidator.equals("ban status is active", profile.ban_status, "active");
  TestValidator.equals(
    "ban reason is null for active account",
    profile.ban_reason,
    null,
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    profile.deleted_at === null,
  );
  TestValidator.predicate(
    "article_count is non-negative integer",
    typeof profile.article_count === "number" && profile.article_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative integer",
    typeof profile.comment_count === "number" && profile.comment_count >= 0,
  );
  // 4. Verify sensitive fields are NOT included in response
  const profileKeys = Object.keys(profile) as string[];
  TestValidator.equals(
    "email not exposed in profile response",
    profileKeys.includes("email"),
    false,
  );
  TestValidator.equals(
    "password_hash not exposed in profile response",
    profileKeys.includes("password_hash"),
    false,
  );
}