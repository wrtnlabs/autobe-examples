import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_section_listing_filter_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering the list of discussion board sections by name keyword.
  // Provide the name filter in the request body and verify that the results only
  // include sections whose names contain the keyword.
  // Validate that pagination metadata is present and accurate.
  // Include administrator authentication as dependency to simulate an authorized user browsing sections.
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Define a name keyword to filter sections by
  const nameKeyword = "eco";
  // 3. Send index request with the filter by name
  const response =
    await api.functional.discussionBoard.administrator.sections.index(
      adminConnection,
      {
        body: {
          // The schema IDiscussionBoardSection.IRequest is empty in definitions,
          // but we send 'name' for filtering as per scenario requirements.
          // We cast it to IDiscussionBoardSection.IRequest for type safety.
          name: nameKeyword,
        } as unknown as IDiscussionBoardSection.IRequest,
      },
    );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Verify pagination information
  TestValidator.predicate(
    "pagination current page should be >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    response.pagination.pages >= 0,
  );
  // 6. Verify that each section name contains the keyword (case insensitive)
  for (const section of response.data) {
    // Because ISummary is empty in definitions, assume 'name' exists for test purpose
    // Using type assertion to avoid compilation error
    const sec = section as unknown as {
      name: string;
    };
    typia.assert(sec);
    TestValidator.predicate(
      `section name '${sec.name}' should include keyword '${nameKeyword}'`,
      sec.name.toLowerCase().includes(nameKeyword.toLowerCase()),
    );
  }
}
