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

export async function test_api_status_enum_references_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a status enumeration for article entity type
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: "published",
          description: "Article has been published and is visible to users",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // Search for references with filters
  const searchRequest = {
    search: "art",
    created_after: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_before: new Date().toISOString(),
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardStatusEnumReference.IRequest;
  const references =
    await api.functional.discussionBoard.superAdmin.status_enums.references.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: searchRequest,
      },
    );
  typia.assert(references);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    references.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", references.pagination.limit, 20);
  TestValidator.predicate(
    "records count non-negative",
    references.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    references.pagination.pages >= 0,
  );
  // Validate business logic - search results should relate to the created status enum
  if (references.data.length > 0) {
    TestValidator.equals(
      "first reference matches status enum ID",
      references.data[0].statusEnum.id,
      statusEnum.id,
    );
  }
}
