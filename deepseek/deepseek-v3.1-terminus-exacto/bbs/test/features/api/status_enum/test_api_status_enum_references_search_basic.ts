import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic search functionality for status enumeration references.
 * 1. Authenticate as admin using join endpoint
 * 2. Perform search with pagination parameters
 * 3. Validate paginated results and metadata
 * Note: This test searches existing status enum references rather than creating new ones,
 * as the API does not provide endpoints to create status enums or their references.
 */
export async function test_api_status_enum_references_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Perform search with pagination parameters
  // Since we cannot create status enums or references via API, we search existing data
  const searchResult =
    await api.functional.discussionBoard.admin.status_enums.references.index(
      adminConnection,
      {
        statusEnumId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 20 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate data structure for any returned references
  if (searchResult.data.length > 0) {
    const firstReference = searchResult.data[0];
    TestValidator.predicate("reference has id", firstReference.id.length > 0);
    TestValidator.predicate(
      "reference has table name",
      firstReference.referenced_table.length > 0,
    );
    TestValidator.predicate(
      "reference has column name",
      firstReference.referenced_column.length > 0,
    );
    TestValidator.predicate(
      "reference has status enum",
      firstReference.statusEnum.id.length > 0,
    );
    TestValidator.predicate(
      "status enum has entity type",
      firstReference.statusEnum.entity_type.length > 0,
    );
    TestValidator.predicate(
      "status enum has value",
      firstReference.statusEnum.value.length > 0,
    );
    TestValidator.predicate(
      "status enum has description",
      firstReference.statusEnum.description.length > 0,
    );
  }
}
