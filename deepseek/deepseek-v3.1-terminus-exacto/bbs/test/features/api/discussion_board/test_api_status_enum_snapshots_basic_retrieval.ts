import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumSnapshot";
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
 * Test the basic retrieval of status enumeration snapshots with minimal filtering.
 * Create a status enum first, then retrieve existing snapshots for the specific
 * status enum. Validate that the response contains the correct pagination metadata
 * and that the snapshot data structure is valid.
 */
export async function test_api_status_enum_snapshots_basic_retrieval(
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
  // 2. Create a status enumeration
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Retrieve snapshots with minimal filtering
  const response =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate snapshot structure for returned data
  response.data.forEach((snapshot, index) => {
    TestValidator.predicate(
      `snapshot ${index} should have id`,
      snapshot.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} should have name`,
      snapshot.snapshot_name.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} should have valid created_at`,
      new Date(snapshot.created_at).getTime() > 0,
    );
  });
  // 6. Validate pagination calculations
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation should be correct",
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );
  }
}
