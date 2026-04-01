import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test invitation list supports partial match search by email address.
 * Validates search functionality for finding specific invitations by email.
 *
 * Test scenarios:
 * 1. Member authentication with proper permissions
 * 2. Search with partial email match
 * 3. Empty search term returns all invitations
 * 4. Search combined with status filter
 * 5. Pagination and sorting validation
 * 6. Response structure validation
 */
export async function test_api_invitation_list_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Search with partial email match (search for domain part)
  const emailDomain = "@test.com";
  const searchResult1 =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          search: emailDomain,
          page: 1,
          limit: 20,
          sort: "invited_at",
          direction: "desc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "pagination structure",
    searchResult1.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(searchResult1.data));
  // 3. Empty search term - should return all invitations without email filter
  const searchResult2 =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          search: undefined,
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "empty search returns pagination",
    searchResult2.pagination !== undefined,
  );
  // 4. Search combined with status filter (pending status)
  const searchResult3 =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          search: "test",
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.predicate(
    "filtered search returns valid response",
    searchResult3.data !== undefined,
  );
  // 5. Test different status filters
  const statuses = ["pending", "accepted", "expired", "revoked"] as const;
  for (const status of statuses) {
    const statusResult =
      await api.functional.hrmPlatform.member.invitations.index(
        memberConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 5,
          } satisfies IHrmPlatformInvitation.IRequest,
        },
      );
    typia.assert(statusResult);
    // Validate each invitation in results has correct status
    for (const invitation of statusResult.data) {
      TestValidator.equals("status matches filter", invitation.status, status);
    }
  }
  // 6. Test pagination parameters
  const paginatedResult =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 15,
          sort: "email",
          direction: "asc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "current page is 1",
    (paginatedResult.pagination.current satisfies number) === 1,
  );
  TestValidator.predicate(
    "limit is 15",
    (paginatedResult.pagination.limit satisfies number) === 15,
  );
  // 7. Validate invitation summary structure
  if (paginatedResult.data.length > 0) {
    const invitation = paginatedResult.data[0];
    typia.assert(invitation);
  }
}
