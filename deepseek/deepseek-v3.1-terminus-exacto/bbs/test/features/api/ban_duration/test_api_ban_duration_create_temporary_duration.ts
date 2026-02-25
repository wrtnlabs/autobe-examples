import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_ban_durations_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_durations_create";
import { prepare_random_discussion_board_ban_duration } from "../../../prepare/prepare_random_discussion_board_ban_duration";

export async function test_api_ban_duration_create_temporary_duration(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using join operation
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Create temporary ban duration
  const banDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.create(
      superAdminConnection,
      {
        body: {
          name: "7 Day Ban",
          description: "Temporary ban for minor violations",
          duration_hours: 168 satisfies number as number,
          is_permanent: false,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(banDuration);
  // Validate response contains all expected fields
  TestValidator.predicate(
    "should have UUID id",
    /^[0-9a-f-]{36}$/i.test(banDuration.id),
  );
  TestValidator.equals(
    "name should match input",
    banDuration.name,
    "7 Day Ban",
  );
  TestValidator.equals(
    "description should match input",
    banDuration.description,
    "Temporary ban for minor violations",
  );
  TestValidator.equals(
    "duration_hours should match input",
    banDuration.duration_hours,
    168,
  );
  TestValidator.equals(
    "is_permanent should be false",
    banDuration.is_permanent,
    false,
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    new Date(banDuration.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    new Date(banDuration.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "deleted_at should be null",
    banDuration.deleted_at,
    null,
  );
}
