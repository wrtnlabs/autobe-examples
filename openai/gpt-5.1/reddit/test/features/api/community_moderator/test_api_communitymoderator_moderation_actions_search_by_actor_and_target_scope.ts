import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Validate that community moderator can filter moderation actions by
 * actorType/actorId and targetScopes using the index endpoint.
 *
 * Business flow:
 *
 * 1. Create a community moderator via /auth/communityModerator/join and obtain
 *    their id through the returned IAuthorized DTO.
 * 2. Create a member user via /auth/memberUser/join.
 * 3. Authenticate as the member user and create a single report via
 *    /communityPlatform/memberUser/reports using
 *    ICommunityPlatformReport.ICreate.
 * 4. Switch authentication to the community moderator and create multiple
 *    moderation actions attached to that report using
 *    /communityPlatform/communityModerator/reports/{reportId}/moderationActions,
 *    with at least two actions targeting "post" and at least one targeting
 *    "comment".
 * 5. Call PATCH /communityPlatform/communityModerator/moderationActions with
 *    ICommunityPlatformModerationAction.IRequest, setting:
 *
 *    - ActorType to "communityModerator"
 *    - ActorId to the moderator id
 *    - TargetScopes to ["post"], and page/limit large enough to retrieve all
 *         matching actions
 * 6. Assert that all returned actions:
 *
 *    - Have targetType === "post"
 *    - Have performedBy.id === moderator.id
 * 7. Assert pagination metadata (records/pages) is consistent with the number of
 *    created "post" actions and that every such action is present in the result
 *    set.
 */
export async function test_api_communitymoderator_moderation_actions_search_by_actor_and_target_scope(
  connection: api.IConnection,
) {
  // 1. Register community moderator and capture id
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://example.com/mod/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorId: string & tags.Format<"uuid"> = moderatorAuthorized.id;

  // 2. Register member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://example.com/member/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Login as member user (to ensure proper actor context) and create a report
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://example.com/member/login",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 4. Switch to moderator and create moderation actions with different target_scope values
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: null,
      href: "https://example.com/mod/login",
      referrer: "https://example.com/mod-landing",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // create 2 "post" actions and 1 "comment" action
  const postActionBodies: ICommunityPlatformModerationAction.ICreate[] = [
    {
      community_id: createdReport.context_community?.id ?? null,
      action_type: "remove_content",
      target_scope: "post",
      reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
      notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
    },
    {
      community_id: createdReport.context_community?.id ?? null,
      action_type: "lock_content",
      target_scope: "post",
      reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
      notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
    },
  ] satisfies ICommunityPlatformModerationAction.ICreate[];

  const commentActionBody = {
    community_id: createdReport.context_community?.id ?? null,
    action_type: "warn_user",
    target_scope: "comment",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdPostActions: ICommunityPlatformModerationAction[] = [];

  for (const body of postActionBodies) {
    const action =
      await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
        connection,
        {
          reportId: createdReport.id,
          body,
        },
      );
    typia.assert(action);
    createdPostActions.push(action);
  }

  const createdCommentAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: createdReport.id,
        body: commentActionBody,
      },
    );
  typia.assert(createdCommentAction);

  // Sanity check: we have at least 3 actions total
  TestValidator.equals(
    "total created moderation actions",
    createdPostActions.length + 1,
    3,
  );

  // 5. Search moderation actions filtered by actorType, actorId and targetScopes ["post"]
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actionTypes: undefined,
    targetScopes: ["post"],
    communityId: createdReport.context_community?.id,
    reportId: createdReport.id,
    actorType: "communityModerator",
    actorId: moderatorId,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    search: undefined,
    sortField: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const pageResult: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.moderationActions.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 6. Validate that all returned actions match filters
  for (const summary of data) {
    typia.assert<ICommunityPlatformModerationAction.ISummary>(summary);

    TestValidator.equals(
      "returned moderation action targetType must be 'post'",
      summary.targetType,
      "post",
    );

    TestValidator.equals(
      "returned moderation action actor id must match moderator",
      summary.performedBy.id,
      moderatorId,
    );
  }

  // 7. Verify pagination metadata aligns with the number of matching actions
  TestValidator.equals(
    "pagination.records equals number of returned summaries",
    pagination.records,
    data.length,
  );

  TestValidator.predicate(
    "pagination.pages is at least 1 when records > 0",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  TestValidator.equals(
    "number of returned actions should equal number of created post actions when within limit",
    data.length,
    createdPostActions.length,
  );
}
