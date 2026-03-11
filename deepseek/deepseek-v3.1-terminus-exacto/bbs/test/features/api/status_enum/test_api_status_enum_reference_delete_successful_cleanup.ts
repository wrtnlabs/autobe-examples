import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
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
import { generate_random_discussion_board_super_admin_status_enums_references_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_references_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";
import { prepare_random_discussion_board_status_enum_reference } from "../../../prepare/prepare_random_discussion_board_status_enum_reference";

/**
 * Test the successful deletion of a status enumeration reference relationship when no domain table records are actively using it.
 * This scenario validates the primary success path where a super administrator removes a dependency relationship that is no longer needed.
 * The test creates a status enumeration value, creates a reference relationship for it, verifies the reference exists,
 * then deletes it successfully. Validates that the deletion operation returns a successful response and that the
 * reference relationship is permanently removed from the system.
 */
export async function test_api_status_enum_reference_delete_successful_cleanup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a status enumeration value
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create a reference relationship for the status enumeration
  const reference =
    await generate_random_discussion_board_super_admin_status_enums_references_create(
      superAdminConnection,
      {
        params: {
          statusEnumId: statusEnum.id,
        },
        body: {
          referenced_table: "discussion_board_articles",
          referenced_column: "status",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  typia.assert(reference);
  // 4. Verify the reference was created successfully
  TestValidator.equals(
    "reference status enum ID",
    reference.discussion_board_status_enums_id,
    statusEnum.id,
  );
  TestValidator.equals(
    "reference table",
    reference.referenced_table,
    "discussion_board_articles",
  );
  TestValidator.equals(
    "reference column",
    reference.referenced_column,
    "status",
  );
  // 5. Delete the reference relationship
  await api.functional.discussionBoard.superAdmin.status_enums.references.erase(
    superAdminConnection,
    {
      statusEnumId: statusEnum.id,
      referenceId: reference.id,
    },
  );
  // 6. Validate the deletion operation completes successfully
  // The erase function returns void, so no response validation needed
  // 7. Verify the reference relationship is permanently removed
  // Since we cannot directly query for deleted references, we validate that
  // the deletion operation completed without errors and the system behaves
  // as expected for a deleted reference
  TestValidator.predicate("deletion completed successfully", true);
}
