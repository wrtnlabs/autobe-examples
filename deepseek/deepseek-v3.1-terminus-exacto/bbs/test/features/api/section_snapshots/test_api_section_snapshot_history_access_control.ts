import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test authorization enforcement for section snapshot access control.
 * Create super administrator and regular administrator accounts.
 * Attempt to access section snapshots with regular administrator credentials
 * to verify proper permission denial. Test successful access with super
 * administrator credentials. Validate pagination parameters and response
 * structure. Test boundary conditions including non-existent section IDs
 * and empty snapshot lists.
 */
export async function test_api_section_snapshot_history_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create regular administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Test 1: Regular administrator should be denied access
  await TestValidator.error("regular admin access denied", async () => {
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  });
  // Test 2: Invalid section ID should return appropriate error
  await TestValidator.error("invalid section ID error", async () => {
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  });
  // Test 3: Valid request with super administrator should succeed
  const snapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination data",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(snapshots.data));
  // Test 4: Pagination boundary conditions
  const emptyPage =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1000, // High page number likely to be empty
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "empty page has empty data",
    emptyPage.data.length === 0,
  );
  // Test 5: Sort parameters validation
  const sortedSnapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 5,
          sort: "created_at" as const,
          order: "desc" as const,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(sortedSnapshots);
  TestValidator.predicate(
    "sorted response has data",
    Array.isArray(sortedSnapshots.data),
  );
}
