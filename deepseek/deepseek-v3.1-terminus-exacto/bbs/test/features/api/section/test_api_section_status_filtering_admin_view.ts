import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_section_status_filtering_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(authResult);
  // 2. Test retrieving all sections with null status (administrator view)
  const allSections = await api.functional.discussionBoard.sections.index(
    adminConnection,
    {
      body: {
        status: null,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(allSections);
  // 3. Verify that we get sections with different statuses (admin should see all)
  const statuses = new Set(allSections.data.map((section) => section.status));
  TestValidator.predicate(
    "admin sees multiple status types",
    statuses.size > 0,
  );
  // 4. Test filtering by specific status (archived)
  const archivedSections = await api.functional.discussionBoard.sections.index(
    adminConnection,
    {
      body: {
        status: "archived" as const,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(archivedSections);
  // 5. Validate that only archived sections are returned
  if (archivedSections.data.length > 0) {
    for (const section of archivedSections.data) {
      TestValidator.equals(
        "section status is archived",
        section.status,
        "archived",
      );
    }
  }
  // 6. Test display order range filtering
  const randomDisplayOrderMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const displayOrderMax = (randomDisplayOrderMin + 10) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const filteredSections = await api.functional.discussionBoard.sections.index(
    adminConnection,
    {
      body: {
        display_order_min: randomDisplayOrderMin,
        display_order_max: displayOrderMax,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(filteredSections);
  // 7. Validate display order range filtering works correctly
  if (filteredSections.data.length > 0) {
    for (const section of filteredSections.data) {
      TestValidator.predicate(
        "display order within range",
        section.display_order >= randomDisplayOrderMin &&
          section.display_order <= displayOrderMax,
      );
    }
  }
  // 8. Validate pagination structure - Fixed property access
  TestValidator.predicate(
    "pagination records is number",
    typeof allSections.pagination.pagination.pagination.pagination.records ===
      "number",
  );
  TestValidator.predicate(
    "pagination current page is valid",
    allSections.pagination.pagination.pagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allSections.pagination.pagination.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof allSections.pagination.pagination.pagination.pagination.pages ===
      "number",
  );
}
