import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_admin_status_enums_create";
import { generate_random_discussion_board_admin_status_enums_references_create } from "../../../generate/generate_random_discussion_board_admin_status_enums_references_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";
import { prepare_random_discussion_board_status_enum_reference } from "../../../prepare/prepare_random_discussion_board_status_enum_reference";

export async function test_api_status_enum_reference_create_different_domain_tables(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status enumeration value
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "user",
          value: "active",
          description: "User account is active and can access the platform",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create first reference relationship for 'users' table 'account_status' column
  const firstReference =
    await generate_random_discussion_board_admin_status_enums_references_create(
      adminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          referenced_table: "users",
          referenced_column: "account_status",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  typia.assert(firstReference);
  // 4. Validate first reference
  TestValidator.equals(
    "status enum ID matches",
    firstReference.discussion_board_status_enums_id,
    statusEnum.id,
  );
  TestValidator.equals(
    "referenced table matches",
    firstReference.referenced_table,
    "users",
  );
  TestValidator.equals(
    "referenced column matches",
    firstReference.referenced_column,
    "account_status",
  );
  // 5. Create second reference relationship for 'discussion_board_members' table 'state' column
  const secondReference =
    await generate_random_discussion_board_admin_status_enums_references_create(
      adminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          referenced_table: "discussion_board_members",
          referenced_column: "state",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  typia.assert(secondReference);
  // 6. Validate second reference
  TestValidator.equals(
    "status enum ID matches",
    secondReference.discussion_board_status_enums_id,
    statusEnum.id,
  );
  TestValidator.equals(
    "referenced table matches",
    secondReference.referenced_table,
    "discussion_board_members",
  );
  TestValidator.equals(
    "referenced column matches",
    secondReference.referenced_column,
    "state",
  );
  // 7. Create third reference relationship for different column in same table
  const thirdReference =
    await generate_random_discussion_board_admin_status_enums_references_create(
      adminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          referenced_table: "users",
          referenced_column: "verification_status",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  typia.assert(thirdReference);
  // 8. Validate third reference
  TestValidator.equals(
    "status enum ID matches",
    thirdReference.discussion_board_status_enums_id,
    statusEnum.id,
  );
  TestValidator.equals(
    "referenced table matches",
    thirdReference.referenced_table,
    "users",
  );
  TestValidator.equals(
    "referenced column matches",
    thirdReference.referenced_column,
    "verification_status",
  );
  // 9. Validate all references have different IDs
  TestValidator.notEquals(
    "first and second reference IDs differ",
    firstReference.id,
    secondReference.id,
  );
  TestValidator.notEquals(
    "first and third reference IDs differ",
    firstReference.id,
    thirdReference.id,
  );
  TestValidator.notEquals(
    "second and third reference IDs differ",
    secondReference.id,
    thirdReference.id,
  );
  // 10. Validate references are independent
  TestValidator.predicate(
    "first reference created successfully",
    firstReference.id !== undefined,
  );
  TestValidator.predicate(
    "second reference created successfully",
    secondReference.id !== undefined,
  );
  TestValidator.predicate(
    "third reference created successfully",
    thirdReference.id !== undefined,
  );
}
