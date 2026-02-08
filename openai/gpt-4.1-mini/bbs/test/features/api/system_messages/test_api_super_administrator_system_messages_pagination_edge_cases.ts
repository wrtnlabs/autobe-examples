import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_system_messages_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(authorized);
  superAdminConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Call index endpoint with empty body multiple times and validate pagination info
  // Since there are no pagination params in request DTO, we cannot test page/limit directly
  // First call
  const firstPageResponse =
    await api.functional.discussionBoard.superAdministrator.systemMessages.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(firstPageResponse);
  // Validate pagination fields
  const { current, limit, pages, records } = firstPageResponse.pagination;
  TestValidator.predicate("pagination current page >= 1", current >= 1);
  TestValidator.predicate("pagination limit positive", limit > 0);
  TestValidator.predicate("pagination pages >= 0", pages >= 0);
  TestValidator.predicate("pagination records >= 0", records >= 0);
  // Second call to assert consistency with first
  const secondPageResponse =
    await api.functional.discussionBoard.superAdministrator.systemMessages.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(secondPageResponse);
  // Pagination should not change significantly between calls
  TestValidator.equals(
    "pagination current same",
    secondPageResponse.pagination.current,
    current,
  );
  TestValidator.equals(
    "pagination limit same",
    secondPageResponse.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination pages same",
    secondPageResponse.pagination.pages,
    pages,
  );
  TestValidator.equals(
    "pagination records same",
    secondPageResponse.pagination.records,
    records,
  );
  // Third call to confirm no errors with empty body
  const thirdPageResponse =
    await api.functional.discussionBoard.superAdministrator.systemMessages.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(thirdPageResponse);
  TestValidator.predicate(
    "data is array",
    Array.isArray(thirdPageResponse.data),
  );
  // Validate current page data is consistent with pagination limit
  TestValidator.predicate(
    "data length less or equal to pagination limit",
    thirdPageResponse.data.length <= limit,
  );
}
