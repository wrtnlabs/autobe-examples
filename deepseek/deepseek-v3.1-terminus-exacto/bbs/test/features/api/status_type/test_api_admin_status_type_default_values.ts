import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_status_types_create } from "../../../generate/generate_random_discussion_board_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

/**
 * Test that optional fields receive proper default values when not provided.
 * 1. Create status type providing only required fields (category, code, display_name).
 * 2. Verify system applies defaults: display_order set to 0, is_active set to true.
 * 3. Check that description defaults to null/empty.
 * 4. Validate that created record includes system-generated fields: UUID id, created_at, updated_at, deleted_at as null.
 * 5. Test edge case where display_order explicitly provided as 0 and is_active explicitly true to ensure explicit values override defaults.
 */
export async function test_api_admin_status_type_default_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test with only required fields (defaults should apply)
  const minimalBody = {
    category: RandomGenerator.alphabets(8),
    code: RandomGenerator.alphabets(6),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardStatusType.ICreate;
  const statusType1 =
    await api.functional.discussionBoard.admin.status_types.create(
      adminConnection,
      {
        body: minimalBody,
      },
    );
  typia.assert(statusType1);
  // Validate defaults
  TestValidator.equals(
    "display_order defaults to 0",
    statusType1.display_order,
    0,
  );
  TestValidator.predicate("is_active defaults to true", statusType1.is_active);
  TestValidator.equals(
    "description defaults to undefined",
    statusType1.description,
    undefined,
  );
  // Validate system fields
  TestValidator.predicate(
    "has UUID id",
    /^[0-9a-f-]{36}$/i.test(statusType1.id),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    typeof statusType1.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    typeof statusType1.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null by default",
    statusType1.deleted_at,
    null,
  );
  // 3. Test with explicit default values (should not override)
  const explicitDefaultsBody = {
    category: RandomGenerator.alphabets(8),
    code: RandomGenerator.alphabets(6),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 satisfies number as number,
    is_active: true,
  } satisfies IDiscussionBoardStatusType.ICreate;
  const statusType2 =
    await api.functional.discussionBoard.admin.status_types.create(
      adminConnection,
      {
        body: explicitDefaultsBody,
      },
    );
  typia.assert(statusType2);
  // Validate explicit values are preserved
  TestValidator.equals(
    "explicit display_order 0 preserved",
    statusType2.display_order,
    0,
  );
  TestValidator.predicate(
    "explicit is_active true preserved",
    statusType2.is_active,
  );
  // 4. Test with description explicitly null
  const withNullDescriptionBody = {
    category: RandomGenerator.alphabets(8),
    code: RandomGenerator.alphabets(6),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
  } satisfies IDiscussionBoardStatusType.ICreate;
  const statusType3 =
    await api.functional.discussionBoard.admin.status_types.create(
      adminConnection,
      {
        body: withNullDescriptionBody,
      },
    );
  typia.assert(statusType3);
  TestValidator.equals(
    "explicit null description preserved",
    statusType3.description,
    null,
  );
}
