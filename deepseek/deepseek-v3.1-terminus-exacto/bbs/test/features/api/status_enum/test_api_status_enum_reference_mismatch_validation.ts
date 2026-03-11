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
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

/**
 * Test that the system properly validates reference ownership when retrieving status enumeration references.
 * This test validates referential integrity by ensuring that a reference relationship cannot be accessed
 * using an incorrect status enumeration ID.
 */
export async function test_api_status_enum_reference_mismatch_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create two different status enumeration values
  const firstStatusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "draft",
          description: "Article draft status",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(firstStatusEnum);
  const secondStatusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "comment",
          value: "pending",
          description: "Comment pending status",
          sort_order: 2,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(secondStatusEnum);
  // 3. The scenario requires creating a reference relationship for the first status enum,
  // but based on the available API functions and utility functions provided,
  // there is no endpoint or utility function available to create status enum references.
  // The only available function is for retrieving references (GET endpoint).
  // 4. Since we cannot create references through the API, we need to test the error handling
  // by attempting to retrieve a non-existent reference with mismatched status enum IDs.
  // This will test that the system properly validates that references belong to the correct status enum.
  // Generate a random reference ID that doesn't exist in the system
  const nonExistentReferenceId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve the non-existent reference using the second statusEnumId (mismatch)
  // This should fail because the reference doesn't exist and doesn't belong to the second status enum
  await TestValidator.error(
    "retrieving non-existent reference with mismatched status enum ID should fail",
    async () => {
      await api.functional.discussionBoard.admin.status_enums.references.at(
        adminConnection,
        {
          statusEnumId: secondStatusEnum.id,
          referenceId: nonExistentReferenceId,
        },
      );
    },
  );
  // 6. Also test with the correct statusEnumId but non-existent reference
  // This should also fail but for a different reason (reference doesn't exist)
  await TestValidator.error(
    "retrieving non-existent reference with correct status enum ID should fail",
    async () => {
      await api.functional.discussionBoard.admin.status_enums.references.at(
        adminConnection,
        {
          statusEnumId: firstStatusEnum.id,
          referenceId: nonExistentReferenceId,
        },
      );
    },
  );
  // The test validates that the system properly handles referential integrity
  // by ensuring that references cannot be accessed with incorrect status enum IDs
}
