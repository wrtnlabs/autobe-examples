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

export async function test_api_ban_duration_retrieval_for_administrator_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create realistic ban duration data
  const isPermanent = typia.random<boolean>();
  const banDuration =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          duration_hours: isPermanent
            ? 0
            : typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<720>
              >(),
          is_permanent: isPermanent,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(banDuration);
  // Retrieve the ban duration by ID
  const retrievedBanDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.at(
      superAdminConnection,
      {
        durationId: banDuration.id,
      },
    );
  typia.assert(retrievedBanDuration);
  // Validate all fields match
  TestValidator.equals(
    "ban duration ID",
    retrievedBanDuration.id,
    banDuration.id,
  );
  TestValidator.equals(
    "ban duration name",
    retrievedBanDuration.name,
    banDuration.name,
  );
  TestValidator.equals(
    "ban duration description",
    retrievedBanDuration.description,
    banDuration.description,
  );
  TestValidator.equals(
    "ban duration hours",
    retrievedBanDuration.duration_hours,
    banDuration.duration_hours,
  );
  TestValidator.equals(
    "ban duration permanent flag",
    retrievedBanDuration.is_permanent,
    banDuration.is_permanent,
  );
  // Validate UUID format
  TestValidator.predicate(
    "valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedBanDuration.id,
    ),
  );
  // Validate timestamp formats
  TestValidator.predicate(
    "created_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      retrievedBanDuration.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      retrievedBanDuration.updated_at,
    ),
  );
}
