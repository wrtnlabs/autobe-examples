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

export async function test_api_status_enum_reference_create_for_existing_table(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status enumeration value for articles
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "draft",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create a reference relationship for the articles table status column
  const reference =
    await generate_random_discussion_board_admin_status_enums_references_create(
      adminConnection,
      {
        params: {
          statusEnumId: statusEnum.id,
        },
        body: {
          referenced_table: "articles",
          referenced_column: "status",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  typia.assert(reference);
  // 4. Validate the reference relationship was created correctly
  TestValidator.equals(
    "status enum ID matches",
    reference.discussion_board_status_enums_id,
    statusEnum.id,
  );
  TestValidator.equals(
    "referenced table matches",
    reference.referenced_table,
    "articles",
  );
  TestValidator.equals(
    "referenced column matches",
    reference.referenced_column,
    "status",
  );
  TestValidator.equals(
    "deleted_at is null for active reference",
    reference.deleted_at,
    null,
  );
  // 5. Verify duplicate reference creation is rejected
  await TestValidator.error("duplicate reference creation", async () => {
    await generate_random_discussion_board_admin_status_enums_references_create(
      adminConnection,
      {
        params: {
          statusEnumId: statusEnum.id,
        },
        body: {
          referenced_table: "articles",
          referenced_column: "status",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  });
}
