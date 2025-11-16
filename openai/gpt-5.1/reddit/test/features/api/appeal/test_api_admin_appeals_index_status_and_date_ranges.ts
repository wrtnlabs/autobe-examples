import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";

/**
 * Validate admin search of appeals by status and creation/resolution date
 * ranges.
 *
 * Business goal
 *
 * - Ensure PATCH /communityPlatform/adminUser/appeals correctly interprets
 *   ICommunityPlatformAppeal.IRequest filters for:
 *
 *   - Statuses
 *   - CreatedFrom / createdTo
 *   - ResolvedFrom / resolvedTo
 * - Confirm pagination metadata reflects the actual number of results in the
 *   returned page.
 *
 * Scenario outline
 *
 * 1. Bootstrap an adminUser account via join (implicit login) so we can create
 *    moderation artifacts.
 * 2. As that adminUser, create a moderation case.
 * 3. As the same adminUser, create two moderation actions belonging to that case.
 * 4. Create two distinct memberUser accounts via join; they represent different
 *    appellants.
 * 5. For each memberUser, authenticate with login and create multiple appeals
 *    referencing the moderation actions (via
 *    api.functional.communityPlatform.memberUser.appeals.create).
 *
 *    - We will create:
 *
 *         - 2 appeals we conceptually treat as the "older" batch
 *         - 2 appeals we conceptually treat as the "newer" batch
 *    - Since we do not control server-side timestamps, we treat creation order as a
 *         proxy and later use created_at / resolved_at values returned from the
 *         server for window filtering.
 * 6. Switch back to adminUser and update two of the appeals to mark them as
 *    resolved (e.g., status "approved" and "rejected"). This also sets
 *    resolved_at on those records.
 * 7. As adminUser, call PATCH /communityPlatform/adminUser/appeals several times
 *    with different ICommunityPlatformAppeal.IRequest payloads:
 *
 *    - Filter A: statuses includes only ["pending"].
 *
 *         - Expect: all returned records have status === "pending".
 *    - Filter B: statuses includes only ["approved", "rejected"].
 *
 *         - Expect: all returned records have status in that set and resolved_at is not
 *                   null (logically resolved).
 *    - Filter C: createdFrom/createdTo window derived from created_at of an "older"
 *         appeal so that only older appeals fall inside the window.
 *    - Filter D: createdFrom/createdTo window derived from a newer appeal so that
 *         only newer appeals are returned.
 *    - Filter E: resolvedFrom/resolvedTo window derived from one of the resolved
 *         appeals so that only that appeal (or subset) is selected.
 * 8. For each filter response:
 *
 *    - Typia.assert on the IPageICommunityPlatformAppeal.ISummary payload.
 *    - Verify using TestValidator.predicate and TestValidator.equals that:
 *
 *         - All returned records satisfy the requested status/date constraints.
 *         - Appeals we expect to be excluded (e.g., wrong status or outside date window)
 *                   are not present in the data array.
 *         - Pagination.records is >= data.length and pagination.limit >= data.length, and
 *                   current page index is consistent with the request.
 */
export async function test_api_admin_appeals_index_status_and_date_ranges(
  connection: api.IConnection,
) {
  // 1. Admin join (implicit login)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: adminEmail,
      password: "AdminPassword!1" as string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  // 2. Create moderation case as admin
  const moderationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: {
          case_key: RandomGenerator.alphaNumeric(12),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          status: "open",
          priority: "high",
          assigned_adminuser_id: adminJoin.id,
        } satisfies ICommunityPlatformModerationCase.ICreate,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 3. Create two moderation actions under the same case
  const actionBodies: ICommunityPlatformModerationAction.ICreate[] = [
    {
      moderation_case_id: moderationCase.id,
      account_restriction_id: null,
      action_type: "restrict_account",
      scope: "user",
      reason_category: "harassment",
      reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    },
    {
      moderation_case_id: moderationCase.id,
      account_restriction_id: null,
      action_type: "remove_content",
      scope: "content",
      reason_category: "spam",
      reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    },
  ];

  const moderationActions: ICommunityPlatformModerationAction[] = [];
  for (const body of actionBodies) {
    const created =
      await api.functional.communityPlatform.adminUser.moderationActions.create(
        connection,
        { body },
      );
    typia.assert<ICommunityPlatformModerationAction>(created);
    moderationActions.push(created);
  }

  // Helper: register and login a member user
  const registerAndLoginMember = async () => {
    const email = typia.random<string & tags.Format<"email">>();
    const username = RandomGenerator.name(1) as string &
      tags.MinLength<3> &
      tags.MaxLength<32>;

    const joined = await api.functional.auth.memberUser.join(connection, {
      body: {
        username,
        email,
        password: "MemberPassword!1" as string & tags.MinLength<8>,
        ip: null,
        href: "https://community.example.com/join" as string &
          tags.Format<"uri">,
        referrer: "https://community.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
    typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined);

    // explicit login to exercise login flow as well
    const loggedIn = await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: email,
        password: "MemberPassword!1",
        ip: null,
        href: "https://community.example.com/login" as string &
          tags.Format<"uri">,
        referrer: "https://community.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
    typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loggedIn);

    return loggedIn;
  };

  // 4. Create two member users
  const memberA = await registerAndLoginMember();
  const memberB = await registerAndLoginMember();

  // Helper: create an appeal as the currently authenticated member user
  const createAppeal = async (
    moderationActionId: string & tags.Format<"uuid">,
    justificationSentences: number,
  ): Promise<ICommunityPlatformAppeal> => {
    const appeal =
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        {
          body: {
            moderation_action_id: moderationActionId,
            justification: RandomGenerator.paragraph({
              sentences: justificationSentences,
              wordMin: 4,
              wordMax: 10,
            }),
          } satisfies ICommunityPlatformAppeal.ICreate,
        },
      );
    typia.assert<ICommunityPlatformAppeal>(appeal);
    return appeal;
  };

  // 5. Member A: create two "older" appeals
  const appealA1 = await createAppeal(moderationActions[0].id, 5);
  const appealA2 = await createAppeal(moderationActions[1].id, 6);

  // 6. Member B: create two "newer" appeals
  const appealB1 = await createAppeal(moderationActions[0].id, 7);
  const appealB2 = await createAppeal(moderationActions[1].id, 8);

  const allAppeals: ICommunityPlatformAppeal[] = [
    appealA1,
    appealA2,
    appealB1,
    appealB2,
  ];

  // Sanity check: all appeals share same moderation case via moderation_action
  allAppeals.forEach((appeal) =>
    typia.assert<ICommunityPlatformAppeal>(appeal),
  );

  // 7. Switch back to admin and resolve two of the appeals
  //    (use login to ensure admin context is active again)
  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminEmail,
      password: "AdminPassword!1",
      ip: null,
      href: "https://community.example.com/admin/login" as string &
        tags.Format<"uri">,
      referrer: "https://community.example.com/admin" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // Mark appealA1 as approved and appealB1 as rejected
  const nowForResolution = new Date();
  const resolvedAtIso = nowForResolution.toISOString() as string &
    tags.Format<"date-time">;

  const approvedAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: appealA1.id,
        body: {
          status: "approved",
          decision_reason: "Appeal accepted: context exonerates user.",
          resolved_at: resolvedAtIso,
        } satisfies ICommunityPlatformAppeal.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(approvedAppeal);

  const rejectedAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: appealB1.id,
        body: {
          status: "rejected",
          decision_reason: "Appeal rejected: policy violation confirmed.",
          resolved_at: resolvedAtIso,
        } satisfies ICommunityPlatformAppeal.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(rejectedAppeal);

  // Update our local collection with resolved records
  const updatedAppeals: ICommunityPlatformAppeal[] = allAppeals.map((a) => {
    if (a.id === approvedAppeal.id) return approvedAppeal;
    if (a.id === rejectedAppeal.id) return rejectedAppeal;
    return a;
  });

  // Derive ordering by created_at for date range tests
  const appealsByCreatedAsc = [...updatedAppeals].sort((x, y) =>
    x.created_at.localeCompare(y.created_at),
  );
  const oldestAppeal = appealsByCreatedAsc[0];
  const newestAppeal = appealsByCreatedAsc[appealsByCreatedAsc.length - 1];

  // 8-A. Filter by pending status only
  const pendingPage =
    await api.functional.communityPlatform.adminUser.appeals.index(connection, {
      body: {
        page: 0 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        statuses: ["pending"],
      } satisfies ICommunityPlatformAppeal.IRequest,
    });
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(pendingPage);

  // Verify all records are pending
  pendingPage.data.forEach((summary) => {
    TestValidator.equals(
      "pending filter - status must be pending",
      summary.status,
      "pending",
    );
  });

  // Verify pagination metadata consistency
  TestValidator.predicate(
    "pending filter - pagination.records >= data.length",
    pendingPage.pagination.records >= pendingPage.data.length,
  );
  TestValidator.predicate(
    "pending filter - pagination.limit >= data.length",
    pendingPage.pagination.limit >= pendingPage.data.length,
  );

  // 8-B. Filter by resolved statuses (approved, rejected)
  const resolvedStatuses = ["approved", "rejected"] as const;
  const resolvedPage =
    await api.functional.communityPlatform.adminUser.appeals.index(connection, {
      body: {
        page: 0 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        statuses: [...resolvedStatuses],
      } satisfies ICommunityPlatformAppeal.IRequest,
    });
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(resolvedPage);

  resolvedPage.data.forEach((summary) => {
    TestValidator.predicate(
      "resolved filter - status must be approved or rejected",
      resolvedStatuses.includes(
        summary.status as (typeof resolvedStatuses)[number],
      ),
    );
    TestValidator.predicate(
      "resolved filter - resolved_at must not be null",
      summary.resolved_at !== null && summary.resolved_at !== undefined,
    );
  });

  TestValidator.predicate(
    "resolved filter - pagination.records >= data.length",
    resolvedPage.pagination.records >= resolvedPage.data.length,
  );

  // 8-C. created_at window covering only the oldest appeal
  const oldestCreated = oldestAppeal.created_at;
  const createdFromOldest = oldestCreated;
  const createdToOldest = oldestCreated;

  const createdOldestPage =
    await api.functional.communityPlatform.adminUser.appeals.index(connection, {
      body: {
        page: 0 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        createdFrom: createdFromOldest,
        createdTo: createdToOldest,
      } satisfies ICommunityPlatformAppeal.IRequest,
    });
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(createdOldestPage);

  createdOldestPage.data.forEach((summary) => {
    TestValidator.predicate(
      "created-at oldest window - appeal created_at within [from,to]",
      summary.created_at >= createdFromOldest &&
        summary.created_at <= createdToOldest,
    );
  });

  // 8-D. created_at window covering only the newest appeal
  const newestCreated = newestAppeal.created_at;
  const createdFromNewest = newestCreated;
  const createdToNewest = newestCreated;

  const createdNewestPage =
    await api.functional.communityPlatform.adminUser.appeals.index(connection, {
      body: {
        page: 0 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        createdFrom: createdFromNewest,
        createdTo: createdToNewest,
      } satisfies ICommunityPlatformAppeal.IRequest,
    });
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(createdNewestPage);

  createdNewestPage.data.forEach((summary) => {
    TestValidator.predicate(
      "created-at newest window - appeal created_at within [from,to]",
      summary.created_at >= createdFromNewest &&
        summary.created_at <= createdToNewest,
    );
  });

  // 8-E. resolved_at window for approvedAppeal only
  const resolvedFrom = approvedAppeal.resolved_at ?? resolvedAtIso;
  const resolvedTo = approvedAppeal.resolved_at ?? resolvedAtIso;

  const resolvedWindowPage =
    await api.functional.communityPlatform.adminUser.appeals.index(connection, {
      body: {
        page: 0 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        resolvedFrom,
        resolvedTo,
      } satisfies ICommunityPlatformAppeal.IRequest,
    });
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(resolvedWindowPage);

  resolvedWindowPage.data.forEach((summary) => {
    TestValidator.predicate(
      "resolved-at window - resolved_at must be within [from,to]",
      summary.resolved_at !== null &&
        summary.resolved_at !== undefined &&
        summary.resolved_at >= resolvedFrom &&
        summary.resolved_at <= resolvedTo,
    );
  });

  // Ensure approvedAppeal.id is present in resolvedWindowPage and that
  // at least one appeal with different status is not within that exact window.
  const idsInResolvedWindow = resolvedWindowPage.data.map((s) => s.id);
  TestValidator.predicate(
    "resolved-at window - approved appeal should appear",
    idsInResolvedWindow.includes(approvedAppeal.id),
  );

  TestValidator.predicate(
    "resolved-at window - at least one pending appeal not in window",
    updatedAppeals.some(
      (a) => a.status === "pending" && !idsInResolvedWindow.includes(a.id),
    ),
  );
}
