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

export async function test_api_status_enum_references_pagination_and_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a status enumeration
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: "published",
          description: "Published article status",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // Test pagination with limit=5 and page=1
  const page1Response =
    await api.functional.discussionBoard.superAdmin.status_enums.references.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(page1Response);
  // Test pagination with limit=5 and page=2
  const page2Response =
    await api.functional.discussionBoard.superAdmin.status_enums.references.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          limit: 5,
          page: 2,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 5);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // Validate total records consistency
  TestValidator.equals(
    "total records consistency",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  // Validate page count calculation
  const expectedPages = Math.ceil(page1Response.pagination.records / 5);
  TestValidator.equals(
    "page count calculation",
    page1Response.pagination.pages,
    expectedPages,
  );
  // Test limit parameter respects maximum value of 100
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.references.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          limit: 100,
          page: 1,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit respected",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test limit parameter respects minimum value of 1
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.references.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          limit: 1,
          page: 1,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit respected",
    minLimitResponse.pagination.limit,
    1,
  );
  // Check that results on different pages don't overlap
  const page1Ids = new Set(page1Response.data.map((ref) => ref.id));
  const page2Ids = new Set(page2Response.data.map((ref) => ref.id));
  const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
  TestValidator.equals("no overlap between pages", intersection.length, 0);
  // Validate that all references belong to the correct status enum
  page1Response.data.forEach((ref) => {
    TestValidator.equals(
      "status enum ID matches",
      ref.statusEnum.id,
      statusEnum.id,
    );
  });
  page2Response.data.forEach((ref) => {
    TestValidator.equals(
      "status enum ID matches",
      ref.statusEnum.id,
      statusEnum.id,
    );
  });
}
