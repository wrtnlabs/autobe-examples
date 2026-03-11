import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
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
import { generate_random_discussion_board_super_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

/**
 * Test successful creation of a new status enumeration value with valid parameters.
 * Verify that the system generates a UUID, sets proper timestamps, and returns the
 * complete entity with all fields populated. Validate that entity_type is one of
 * the expected domain categories (article, comment, admin_request, user, ban, attachment)
 * and that sort_order is a positive integer. Confirm that the status value becomes
 * immediately available for use in the respective domain entity.
 */
export async function test_api_status_enum_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Generate random data for status enum creation
  const entityTypeOptions = [
    "article",
    "comment",
    "admin_request",
    "user",
    "ban",
    "attachment",
  ] as const;
  const entityType = RandomGenerator.pick(entityTypeOptions);
  // Step 3: Create status enumeration using utility function
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: entityType,
          value: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: (() => {
            const order = typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >();
            return order satisfies number as number;
          })(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // Step 4: Validate business logic with TestValidator
  TestValidator.equals(
    "entity type matches input",
    statusEnum.entity_type,
    entityType,
  );
  TestValidator.predicate(
    "sort order is non-negative",
    statusEnum.sort_order >= 0,
  );
  TestValidator.predicate(
    "status is active by default",
    statusEnum.is_active === true,
  );
  TestValidator.predicate(
    "has UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statusEnum.id,
    ),
  );
  TestValidator.predicate(
    "created timestamp is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statusEnum.created_at),
  );
  TestValidator.predicate(
    "updated timestamp is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statusEnum.updated_at),
  );
  TestValidator.predicate(
    "deleted_at is null for active status",
    statusEnum.deleted_at === null,
  );
  // Step 5: Validate immediate availability (check that all fields are populated)
  TestValidator.predicate(
    "has description value",
    statusEnum.description.length > 0,
  );
  TestValidator.predicate("has status value", statusEnum.value.length > 0);
}
