import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Search for pending administrator requests
  const searchCriteria = {
    status: "pending" as const,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardAdminRequest.IRequest;
  const response =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: searchCriteria,
      },
    );
  typia.assert(response);
  // Validate pagination metadata using fallback values
  const expectedPage = searchCriteria.page ?? 1;
  const expectedLimit = searchCriteria.limit ?? 10;
  TestValidator.equals(
    "current page matches",
    response.pagination.current,
    expectedPage,
  );
  TestValidator.equals(
    "limit matches",
    response.pagination.limit,
    expectedLimit,
  );
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // Validate each request has pending status
  for (const request of response.data) {
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    TestValidator.predicate(
      "request has member information",
      request.member !== undefined,
    );
    TestValidator.predicate(
      "member has display name",
      request.member.display_name.length > 0,
    );
  }
}
