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

export async function test_api_ban_duration_create_permanent_option(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create permanent ban duration
  const permanentBanDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.create(
      superAdminConnection,
      {
        body: {
          name: "Permanent Ban",
          description: "Permanent ban for severe or repeat violations",
          duration_hours: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          is_permanent: true,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  // Validate the response
  typia.assert(permanentBanDuration);
  // Verify permanent ban properties
  TestValidator.equals(
    "permanent ban has correct name",
    permanentBanDuration.name,
    "Permanent Ban",
  );
  TestValidator.equals(
    "permanent ban has correct description",
    permanentBanDuration.description,
    "Permanent ban for severe or repeat violations",
  );
  TestValidator.equals(
    "permanent ban has duration_hours = 0",
    permanentBanDuration.duration_hours,
    0,
  );
  TestValidator.predicate(
    "permanent ban has is_permanent = true",
    permanentBanDuration.is_permanent === true,
  );
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      permanentBanDuration.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      permanentBanDuration.created_at,
    ),
  );
}
