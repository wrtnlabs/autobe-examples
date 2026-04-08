import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization pagination functionality for authenticated members.
 *
 * Validates the complete pagination flow for organization listing, ensuring that members can navigate through their organizations using page and limit parameters. Tests pagination metadata accuracy, data distinctness across pages, and boundary conditions when requesting beyond available pages.
 *
 * The test verifies that pagination metadata (current, limit, records, pages) accurately reflects the data returned, that consecutive pages contain distinct organizations without overlap, and that requesting a page beyond the total pages returns an empty data array with correct pagination information.
 *
 * 1. Register and authenticate a new member account.
 * 2. Fetch page 1 with limit 10 and validate pagination metadata.
 * 3. Fetch page 2 with limit 10 and verify distinct organizations from page 1.
 * 4. Request a page beyond available pages and verify empty data array.
 */
export async function test_api_organization_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Fetch page 1 with limit 10
  const page1 = await api.functional.hrmTimeTrack.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackOrganization.IRequest,
    },
  );
  typia.assert(page1);
  // Validate page 1 pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 has records", page1.pagination.records >= 0);
  TestValidator.predicate(
    "page 1 pages calculated",
    page1.pagination.pages >= 0,
  );
  // Collect organization IDs from page 1
  const page1Ids = new Set(page1.data.map((org) => org.id));
  // 3. Fetch page 2 with limit 10 (if pages >= 2)
  if (page1.pagination.pages >= 2) {
    const page2 = await api.functional.hrmTimeTrack.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IHrmTimeTrackOrganization.IRequest,
      },
    );
    typia.assert(page2);
    // Validate page 2 pagination metadata
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
    // Verify no duplicate organizations between page 1 and page 2
    const page2Ids = new Set(page2.data.map((org) => org.id));
    const hasDuplicates = Array.from(page1Ids).some((id) => page2Ids.has(id));
    TestValidator.predicate(
      "page 1 and page 2 have no duplicates",
      !hasDuplicates,
    );
  }
  // 4. Request page beyond available pages
  const beyondPage = page1.pagination.pages + 1;
  const emptyPage =
    await api.functional.hrmTimeTrack.member.organizations.index(
      memberConnection,
      {
        body: {
          page: beyondPage,
          limit: 10,
        } satisfies IHrmTimeTrackOrganization.IRequest,
      },
    );
  typia.assert(emptyPage);
  // Validate empty page response
  TestValidator.equals(
    "beyond page current",
    emptyPage.pagination.current,
    beyondPage,
  );
  TestValidator.equals("beyond page limit", emptyPage.pagination.limit, 10);
  TestValidator.equals("beyond page data is empty", emptyPage.data.length, 0);
  TestValidator.equals(
    "beyond page records matches",
    emptyPage.pagination.records,
    page1.pagination.records,
  );
}
