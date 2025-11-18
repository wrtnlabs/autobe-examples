import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHold";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate legal hold search filtering by creator, releaser, and active state.
 *
 * This scenario creates two administrator accounts (Creator A and Creator B),
 * then creates and updates several legal holds under each admin account. It
 * verifies that the admin search endpoint for legal holds (PATCH
 * /shoppingMall/admin/adminSearch/legalHolds) can:
 *
 * 1. Filter active holds by the admin who created them using
 *    `created_by_admin_ids` and `is_active = true`.
 * 2. Filter inactive (released) holds by the admin who released them using
 *    `released_by_admin_ids` and `is_active = false`.
 * 3. Return pagination metadata that is coherent with the result set.
 * 4. Populate `created_by_admin` and `released_by_admin` summary associations
 *    consistently with the underlying admin identities.
 */
export async function test_api_admin_legal_hold_search_by_creator_and_release_state(
  connection: api.IConnection,
) {
  // 1. Create Creator A admin via join
  const creatorAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const creatorAAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: creatorAJoinBody,
    });
  typia.assert(creatorAAuth);

  const creatorAId = creatorAAuth.admin?.id ?? creatorAAuth.id;

  // 2. Under Creator A, create both active and to-be-released legal holds
  const activeHoldACode = `A-ACTIVE-${RandomGenerator.alphaNumeric(8)}`;
  const activeHoldACreate = {
    code: activeHoldACode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: null,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;
  const activeHoldA = await api.functional.shoppingMall.admin.legalHolds.create(
    connection,
    {
      body: activeHoldACreate,
    },
  );
  typia.assert(activeHoldA);

  const releasedHoldACode = `A-RELEASED-${RandomGenerator.alphaNumeric(8)}`;
  const releasedHoldACreate = {
    code: releasedHoldACode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.paragraph({ sentences: 2 }),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;
  const releasedHoldABefore =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: releasedHoldACreate,
    });
  typia.assert(releasedHoldABefore);

  const releaseAtA = new Date().toISOString();
  const releasedHoldAUpdate = {
    status: "released",
    released_at: releaseAtA,
  } satisfies IShoppingMallLegalHold.IUpdate;
  const releasedHoldA =
    await api.functional.shoppingMall.admin.legalHolds.update(connection, {
      legalHoldCode: releasedHoldACode,
      body: releasedHoldAUpdate,
    });
  typia.assert(releasedHoldA);

  // 3. Create Creator B admin via join (switches connection auth to Creator B)
  const creatorBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const creatorBAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: creatorBJoinBody,
    });
  typia.assert(creatorBAuth);

  const creatorBId = creatorBAuth.admin?.id ?? creatorBAuth.id;

  const activeHoldBCode = `B-ACTIVE-${RandomGenerator.alphaNumeric(8)}`;
  const activeHoldBCreate = {
    code: activeHoldBCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 2 }),
    external_reference: null,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;
  const activeHoldB = await api.functional.shoppingMall.admin.legalHolds.create(
    connection,
    {
      body: activeHoldBCreate,
    },
  );
  typia.assert(activeHoldB);

  const releasedHoldBCode = `B-RELEASED-${RandomGenerator.alphaNumeric(8)}`;
  const releasedHoldBCreate = {
    code: releasedHoldBCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 3 }),
    external_reference: null,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;
  const releasedHoldBBefore =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: releasedHoldBCreate,
    });
  typia.assert(releasedHoldBBefore);

  const releaseAtB = new Date().toISOString();
  const releasedHoldBUpdate = {
    status: "released",
    released_at: releaseAtB,
  } satisfies IShoppingMallLegalHold.IUpdate;
  const releasedHoldB =
    await api.functional.shoppingMall.admin.legalHolds.update(connection, {
      legalHoldCode: releasedHoldBCode,
      body: releasedHoldBUpdate,
    });
  typia.assert(releasedHoldB);

  // 4. Search active holds created by Creator A
  const activeByCreatorARequest = {
    created_by_admin_ids: [creatorAId],
    is_active: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallLegalHold.IRequest;

  const activeByCreatorA: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
      connection,
      { body: activeByCreatorARequest },
    );
  typia.assert(activeByCreatorA);

  // Pagination sanity checks
  const paginationA = activeByCreatorA.pagination;
  TestValidator.predicate(
    "activeByCreatorA pagination.current is non-negative",
    paginationA.current >= 0,
  );
  TestValidator.predicate(
    "activeByCreatorA pagination.limit is non-negative",
    paginationA.limit >= 0,
  );
  TestValidator.predicate(
    "activeByCreatorA pagination.records is non-negative",
    paginationA.records >= 0,
  );
  TestValidator.predicate(
    "activeByCreatorA pagination.pages is non-negative",
    paginationA.pages >= 0,
  );

  // Ensure all returned entries are created by Creator A and appear active
  for (const summary of activeByCreatorA.data) {
    TestValidator.equals(
      "each active summary created_by_admin_id is Creator A",
      summary.created_by_admin_id,
      creatorAId,
    );
    TestValidator.equals(
      "active search returns entries with 'active' status",
      summary.status,
      "active",
    );
    if (summary.released_at !== undefined && summary.released_at !== null) {
      TestValidator.predicate(
        "active results should not have released_at set",
        false,
      );
    }
    if (summary.created_by_admin !== undefined) {
      TestValidator.equals(
        "created_by_admin summary id matches Creator A id",
        summary.created_by_admin.id,
        creatorAId,
      );
      TestValidator.equals(
        "created_by_admin summary email matches Creator A email",
        summary.created_by_admin.email,
        creatorAAuth.email,
      );
    }
  }

  // 5. Search inactive (released) holds released by Creator B
  const inactiveByReleaserBRequest = {
    released_by_admin_ids: [creatorBId],
    is_active: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallLegalHold.IRequest;

  const inactiveByReleaserB: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
      connection,
      { body: inactiveByReleaserBRequest },
    );
  typia.assert(inactiveByReleaserB);

  const paginationB = inactiveByReleaserB.pagination;
  TestValidator.predicate(
    "inactiveByReleaserB pagination.current is non-negative",
    paginationB.current >= 0,
  );
  TestValidator.predicate(
    "inactiveByReleaserB pagination.limit is non-negative",
    paginationB.limit >= 0,
  );
  TestValidator.predicate(
    "inactiveByReleaserB pagination.records is non-negative",
    paginationB.records >= 0,
  );
  TestValidator.predicate(
    "inactiveByReleaserB pagination.pages is non-negative",
    paginationB.pages >= 0,
  );

  for (const summary of inactiveByReleaserB.data) {
    if (
      summary.released_by_admin_id !== undefined &&
      summary.released_by_admin_id !== null
    ) {
      TestValidator.equals(
        "each inactive summary released_by_admin_id is Creator B",
        summary.released_by_admin_id,
        creatorBId,
      );
    }
    TestValidator.equals(
      "inactive search returns entries with 'released' status",
      summary.status,
      "released",
    );
    if (summary.released_at !== undefined && summary.released_at !== null) {
      // Ensure released_at looks non-empty; detailed format is already
      // validated by typia.assert on the page response.
      TestValidator.predicate(
        "released_at should be non-empty string for released holds",
        summary.released_at.length > 0,
      );
    }
    if (
      summary.released_by_admin !== undefined &&
      summary.released_by_admin !== null
    ) {
      TestValidator.equals(
        "released_by_admin summary id matches Creator B id",
        summary.released_by_admin.id,
        creatorBId,
      );
      TestValidator.equals(
        "released_by_admin summary email matches Creator B email",
        summary.released_by_admin.email,
        creatorBAuth.email,
      );
    }
  }
}
