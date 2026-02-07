import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_ban_durations_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_durations_create";
import { prepare_random_discussion_board_ban_duration } from "../../../prepare/prepare_random_discussion_board_ban_duration";

/**
 * Test successful retrieval of an existing ban duration configuration.
 * 1. Create super administrator account and authenticate
 * 2. Create a ban duration record using super admin privileges
 * 3. Retrieve the ban duration by ID using admin privileges
 * 4. Validate all fields match the created record
 */
export async function test_api_admin_ban_duration_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create ban duration record
  const banDurationCreate = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    duration_hours: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_permanent: false,
  } satisfies IDiscussionBoardBanDuration.ICreate;
  const createdBanDuration =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      { body: banDurationCreate },
    );
  typia.assert(createdBanDuration);
  // 3. Create and authenticate regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 4. Retrieve ban duration by ID
  const retrievedBanDuration =
    await api.functional.discussionBoard.admin.ban_durations.at(
      adminConnection,
      { durationId: createdBanDuration.id },
    );
  typia.assert(retrievedBanDuration);
  // 5. Validate all fields match (typia.assert already validates everything)
  TestValidator.equals(
    "Complete ban duration record matches",
    retrievedBanDuration,
    createdBanDuration,
  );
}
