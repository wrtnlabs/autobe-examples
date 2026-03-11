import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumReference";
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

export async function test_api_status_enum_references_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Update connection with authorization token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${authResult.token.access}`,
  };
  // Create a fresh status enumeration with no references
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "admin_request",
          value: "pending",
          description: "Test status enumeration with no references",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // Search for references with default parameters (no filters)
  const references =
    await api.functional.discussionBoard.superAdmin.status_enums.references.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {} satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(references);
  // Verify pagination metadata shows empty results
  TestValidator.equals(
    "records count should be 0",
    references.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    references.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    references.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default",
    references.pagination.limit,
    100,
  );
  // Verify data array is empty
  TestValidator.equals("data array should be empty", references.data.length, 0);
}
