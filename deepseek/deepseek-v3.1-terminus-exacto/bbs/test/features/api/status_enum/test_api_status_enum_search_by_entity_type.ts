import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_status_enum_search_by_entity_type(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test searching status enums for 'article' entity type
  const articleStatusEnums =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(articleStatusEnums);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    articleStatusEnums.pagination !== undefined,
  );
  TestValidator.equals(
    "current page",
    articleStatusEnums.pagination.current,
    1,
  );
  TestValidator.equals("limit", articleStatusEnums.pagination.limit, 10);
  TestValidator.predicate(
    "records count valid",
    articleStatusEnums.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    articleStatusEnums.pagination.pages >= 0,
  );
  // Validate all returned status enums are for 'article' entity type
  if (articleStatusEnums.data.length > 0) {
    for (const statusEnum of articleStatusEnums.data) {
      TestValidator.equals(
        "entity type matches",
        statusEnum.entity_type,
        "article",
      );
      TestValidator.predicate(
        "status value exists",
        statusEnum.value.length > 0,
      );
      TestValidator.predicate(
        "description exists",
        statusEnum.description.length > 0,
      );
      TestValidator.predicate("sort order valid", statusEnum.sort_order >= 0);
      TestValidator.predicate("is active true", statusEnum.is_active === true);
    }
    // Validate sort order (should be ascending by sort_order)
    for (let i = 1; i < articleStatusEnums.data.length; i++) {
      TestValidator.predicate(
        "sort order ascending",
        articleStatusEnums.data[i - 1].sort_order <=
          articleStatusEnums.data[i].sort_order,
      );
    }
  }
  // Test searching status enums for 'comment' entity type
  const commentStatusEnums =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superAdminConnection,
      {
        body: {
          entity_type: "comment",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(commentStatusEnums);
  // Validate all returned status enums are for 'comment' entity type
  if (commentStatusEnums.data.length > 0) {
    for (const statusEnum of commentStatusEnums.data) {
      TestValidator.equals(
        "entity type matches",
        statusEnum.entity_type,
        "comment",
      );
    }
  }
  // Test searching status enums for 'admin_request' entity type
  const adminRequestStatusEnums =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superAdminConnection,
      {
        body: {
          entity_type: "admin_request",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(adminRequestStatusEnums);
  // Validate all returned status enums are for 'admin_request' entity type
  if (adminRequestStatusEnums.data.length > 0) {
    for (const statusEnum of adminRequestStatusEnums.data) {
      TestValidator.equals(
        "entity type matches",
        statusEnum.entity_type,
        "admin_request",
      );
    }
  }
  // Test pagination by requesting page 2
  const page2StatusEnums =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          is_active: true,
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(page2StatusEnums);
  TestValidator.equals(
    "page 2 current page",
    page2StatusEnums.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2StatusEnums.pagination.limit, 5);
  // Test searching without entity_type filter (should return all types)
  const allStatusEnums =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(allStatusEnums);
  // Verify that when no entity_type filter is applied, we get mixed entity types
  if (allStatusEnums.data.length > 0) {
    const entityTypes = new Set(
      allStatusEnums.data.map((item) => item.entity_type),
    );
    TestValidator.predicate(
      "multiple entity types exist",
      entityTypes.size > 1,
    );
  }
}
