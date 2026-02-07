import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
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

export async function test_api_ban_duration_creation_unique_name(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first ban duration option with random name
  const banDuration1 =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >(),
          is_permanent: false,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(banDuration1);
  // Create second ban duration option with different random name
  const banDuration2 =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          duration_hours: 0,
          is_permanent: true,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(banDuration2);
  // Create third ban duration option with another unique random name
  const banDuration3 =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >(),
          is_permanent: false,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(banDuration3);
  // Validate all ban durations have unique names
  TestValidator.notEquals(
    "ban duration names should be unique",
    banDuration1.name,
    banDuration2.name,
  );
  TestValidator.notEquals(
    "ban duration names should be unique",
    banDuration1.name,
    banDuration3.name,
  );
  TestValidator.notEquals(
    "ban duration names should be unique",
    banDuration2.name,
    banDuration3.name,
  );
  // Validate ban duration properties
  TestValidator.predicate(
    "first ban duration should be temporary",
    banDuration1.is_permanent === false,
  );
  TestValidator.predicate(
    "second ban duration should be permanent",
    banDuration2.is_permanent === true,
  );
  TestValidator.predicate(
    "third ban duration should be temporary",
    banDuration3.is_permanent === false,
  );
  TestValidator.predicate(
    "first ban duration hours should be positive",
    banDuration1.duration_hours > 0,
  );
  TestValidator.equals(
    "second ban duration hours should be 0",
    banDuration2.duration_hours,
    0,
  );
  TestValidator.predicate(
    "third ban duration hours should be positive",
    banDuration3.duration_hours > 0,
  );
  // Test uniqueness constraint by trying to create a duplicate name
  await TestValidator.error(
    "should reject duplicate ban duration name",
    async () => {
      await generate_random_discussion_board_super_admin_ban_durations_create(
        superAdminConnection,
        {
          body: {
            name: banDuration1.name,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            duration_hours: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
            >(),
            is_permanent: false,
          } satisfies IDiscussionBoardBanDuration.ICreate,
        },
      );
    },
  );
}
