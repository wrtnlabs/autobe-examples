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

export async function test_api_status_enum_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create first status enumeration for articles
  const statusCreateBody = {
    entity_type: "article",
    value: "draft",
    description: "Article is in draft state and not yet published",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IDiscussionBoardStatusEnum.ICreate;
  const status =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert(status);
  // Verify uniqueness constraint by attempting to create duplicate
  await TestValidator.error(
    "duplicate status creation should fail",
    async () => {
      await generate_random_discussion_board_admin_status_enums_create(
        adminConnection,
        {
          body: statusCreateBody,
        },
      );
    },
  );
}
