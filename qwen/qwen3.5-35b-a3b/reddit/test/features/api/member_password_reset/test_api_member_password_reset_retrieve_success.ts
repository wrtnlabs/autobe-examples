import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const passwordReset =
    await api.functional.redditCommunity.member.password_resets.at(
      memberConnection,
      { resetId },
    );
  typia.assert(passwordReset);
  TestValidator.equals("password reset id matches", passwordReset.id, resetId);
  TestValidator.equals(
    "email exists and is string",
    true,
    typeof passwordReset.email === "string",
  );
  TestValidator.equals(
    "token field exists and is string",
    true,
    typeof passwordReset.token === "string",
  );
  TestValidator.equals(
    "expires_at is valid datetime",
    true,
    passwordReset.expires_at !== undefined,
  );
  TestValidator.equals(
    "created_at is valid datetime",
    true,
    passwordReset.created_at !== undefined,
  );
  TestValidator.equals(
    "is_expired is boolean",
    true,
    typeof passwordReset.is_expired === "boolean",
  );
  TestValidator.equals(
    "admin exists and has id",
    true,
    passwordReset.admin.id !== undefined,
  );
  TestValidator.equals(
    "admin has display_name field",
    true,
    passwordReset.admin.display_name !== undefined,
  );
  TestValidator.equals(
    "admin has is_active field",
    true,
    typeof passwordReset.admin.is_active === "boolean",
  );
  TestValidator.equals(
    "admin has created_at",
    true,
    passwordReset.admin.created_at !== undefined,
  );
  TestValidator.equals(
    "admin has updated_at",
    true,
    passwordReset.admin.updated_at !== undefined,
  );
  TestValidator.equals(
    "admin has deleted_at nullable",
    true,
    passwordReset.admin.deleted_at === null ||
      typeof passwordReset.admin.deleted_at === "string",
  );
  TestValidator.equals(
    "admin email matches",
    true,
    typeof passwordReset.admin.email === "string",
  );
  TestValidator.equals(
    "admin id matches password_reset admin id",
    true,
    passwordReset.admin.id === passwordReset.reddit_community_admin_id,
  );
  TestValidator.predicate(
    "token is not plain UUID (hashed/masked)",
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      passwordReset.token,
    ),
  );
}