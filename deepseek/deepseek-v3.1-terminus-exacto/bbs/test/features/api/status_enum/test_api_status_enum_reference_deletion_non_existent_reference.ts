import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
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
 * Test attempting to delete a non-existent reference relationship.
 * Create a status enumeration, then attempt to delete a reference with a random UUID that does not exist.
 * The system should respond with appropriate error (e.g., 404 Not Found).
 */
export async function test_api_status_enum_reference_deletion_non_existent_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status enumeration with random entity type
  const entityTypes = [
    "article",
    "comment",
    "admin_request",
    "user",
    "ban",
    "attachment",
  ] as const;
  const randomEntityType = RandomGenerator.pick(entityTypes);
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: randomEntityType,
          value: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Attempt to delete a non-existent reference
  const nonExistentStatusEnumId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentReferenceId = typia.random<string & tags.Format<"uuid">>();
  // 4. Validate that the operation fails with 404 error
  await TestValidator.httpError(
    "delete non-existent reference should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.status_enums.references.erase(
        adminConnection,
        {
          statusEnumId: nonExistentStatusEnumId,
          referenceId: nonExistentReferenceId,
        },
      );
    },
  );
}
