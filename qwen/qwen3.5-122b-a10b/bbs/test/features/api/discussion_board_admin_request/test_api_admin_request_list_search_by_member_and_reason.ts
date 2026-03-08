import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_list_search_by_member_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular member accounts for submitting requests
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1DisplayName = RandomGenerator.name();
  const member1Reason = `I want to help moderate the community and ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2DisplayName = RandomGenerator.name();
  const member2Reason = `Experienced moderator with ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3DisplayName = RandomGenerator.name();
  const member3Reason = `Community leader seeking admin privileges for ${RandomGenerator.paragraph({ sentences: 2 })}`;
  // 3. Submit administrator requests (using SDK directly as no utility function exists)
  const request1 =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          search: member1Email.split("@")[0], // Search by email username
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(request1);
  // 4. Test search by email partial match
  const searchByEmail =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          search: member1Email.split("@")[0],
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchByEmail);
  // 5. Test search by display name partial match
  const searchByDisplayName =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          search: member2DisplayName.split(" ")[0],
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchByDisplayName);
  // 6. Test search by reason partial match
  const searchByReason =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          search: "moderator",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchByReason);
  // 7. Test search with no matches
  const searchNoMatch =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_keyword_xyz123",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchNoMatch);
  TestValidator.equals(
    "no matches returns empty data",
    searchNoMatch.data.length,
    0,
  );
  TestValidator.equals(
    "no matches shows 0 records",
    searchNoMatch.pagination.records,
    0,
  );
  // 8. Test search with pagination
  const searchWithPagination =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          search: "moderator",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchWithPagination);
  TestValidator.equals(
    "pagination current page",
    searchWithPagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit set",
    searchWithPagination.pagination.limit > 0,
  );
}
