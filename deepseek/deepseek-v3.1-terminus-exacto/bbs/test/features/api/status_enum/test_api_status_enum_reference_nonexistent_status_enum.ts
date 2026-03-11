import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { generate_random_discussion_board_admin_status_enums_references_create } from "../../../generate/generate_random_discussion_board_admin_status_enums_references_create";
import { prepare_random_discussion_board_status_enum_reference } from "../../../prepare/prepare_random_discussion_board_status_enum_reference";

export async function test_api_status_enum_reference_nonexistent_status_enum(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate a random UUID that doesn't correspond to any existing status enumeration
  const nonExistentStatusEnumId = typia.random<string & tags.Format<"uuid">>();
  // Prepare reference relationship data
  const referenceBody = {
    referenced_table: RandomGenerator.alphabets(10),
    referenced_column: RandomGenerator.alphabets(8),
  } satisfies IDiscussionBoardStatusEnumReference.ICreate;
  // Attempt to create reference relationship with non-existent statusEnumId
  await TestValidator.error(
    "should fail when creating reference for non-existent status enumeration",
    async () => {
      await generate_random_discussion_board_admin_status_enums_references_create(
        adminConnection,
        {
          params: {
            statusEnumId: nonExistentStatusEnumId,
          },
          body: referenceBody,
        },
      );
    },
  );
}
