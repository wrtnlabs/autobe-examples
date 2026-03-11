import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_profile_banned_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve admin's profile through the admin profile endpoint
  // Note: This endpoint returns IDiscussionBoardMember type
  const profile =
    await api.functional.discussionBoard.admin.profile.at(adminConnection);
  typia.assert(profile);
  // 3. Validate profile structure and data
  TestValidator.predicate(
    "profile has id",
    profile.id !== null && profile.id !== undefined,
  );
  TestValidator.predicate(
    "profile has display_name",
    profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "profile has ban_status",
    profile.ban_status !== null && profile.ban_status !== undefined,
  );
  TestValidator.predicate(
    "profile has created_at",
    profile.created_at !== null && profile.created_at !== undefined,
  );
  // 4. Validate ban_status is 'active' for non-banned admin
  TestValidator.equals(
    "ban_status is active for non-banned admin",
    profile.ban_status,
    "active",
  );
  TestValidator.equals(
    "ban_reason is null for non-banned admin",
    profile.ban_reason,
    null,
  );
}
