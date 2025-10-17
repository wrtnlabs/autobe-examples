import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussExpertDomainBadge";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussExpertDomainBadge";

export async function test_api_expert_domain_badges_public_list_empty_for_existing_user(
  connection: api.IConnection,
) {
  /**
   * Validate public listing of expert domain badges returns an empty page for
   * an existing user with no badges.
   *
   * Steps:
   *
   * 1. Register a new member to obtain a valid userId (UUID).
   * 2. Create a public (unauthenticated) connection.
   * 3. PATCH /econDiscuss/users/{userId}/expertDomainBadges with pagination and
   *    status filter.
   * 4. Expect 200 OK with empty data array and zero records (on real backend).
   *
   * Simulator note: when connection.simulate === true, the SDK returns random
   * data in simulate mode. Therefore, only schema assertion is performed and
   * business-content assertions (like "empty data") are skipped.
   */

  // 1) Register a new member (no badges exist by default)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // satisfies MinLength<8>
    display_name: RandomGenerator.name(1), // 1+ character, <= 120
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // userId to list badges for
  const userId = authorized.id;

  // 2) Build a public (unauthenticated) connection
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 3) Call the public listing endpoint with pagination and a status filter
  const requestBody = {
    page: 1,
    pageSize: 20,
    status: "active",
  } satisfies IEconDiscussExpertDomainBadge.IRequest;

  const page = await api.functional.econDiscuss.users.expertDomainBadges.index(
    publicConn,
    {
      userId,
      body: requestBody,
    },
  );
  typia.assert(page);

  // 4) Business assertions on real backend only (skip in simulate mode)
  if (connection.simulate !== true) {
    TestValidator.equals(
      "expert badges list should be empty for new user",
      page.data,
      [],
    );
    TestValidator.equals(
      "pagination.records should be 0 for empty list",
      page.pagination.records,
      0,
    );
  }
}
