import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOnCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOnCommunity";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_admin_moderation_action_community_view_without_account_restriction(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case
  const caseKey = `case-${RandomGenerator.alphaNumeric(12)}`;
  const caseTitle = RandomGenerator.paragraph({ sentences: 3 });
  const caseDescription = RandomGenerator.paragraph({ sentences: 5 });

  const moderationCaseBody = {
    case_key: caseKey,
    title: caseTitle,
    description: caseDescription,
    status: "open",
    priority: "medium",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  TestValidator.equals(
    "moderation case case_key should match request",
    createdCase.case_key,
    moderationCaseBody.case_key,
  );
  TestValidator.equals(
    "moderation case title should match request",
    createdCase.title,
    moderationCaseBody.title,
  );

  // 3. Create a moderation action header without account restriction
  const actionType = "close_community";
  const scope = "community";
  const reasonCategory = "policy_violation";
  const reasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const moderationActionBody = {
    moderation_case_id: createdCase.id,
    action_type: actionType,
    scope,
    reason_category: reasonCategory,
    reason_detail: reasonDetail,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(createdAction);

  TestValidator.equals(
    "moderation action action_type should match request",
    createdAction.action_type,
    moderationActionBody.action_type,
  );
  TestValidator.equals(
    "moderation action scope should match request",
    createdAction.scope,
    moderationActionBody.scope,
  );
  TestValidator.equals(
    "moderation action reason_category should match request",
    createdAction.reason_category,
    moderationActionBody.reason_category,
  );
  TestValidator.equals(
    "moderation action reason_detail should match request",
    createdAction.reason_detail,
    moderationActionBody.reason_detail,
  );

  // 4. Fetch community-targeted view
  const communityAction: ICommunityPlatformModerationActionOnCommunity =
    await api.functional.communityPlatform.adminUser.moderationActions.community.at(
      connection,
      {
        moderationActionId: createdAction.id,
      },
    );
  typia.assert<ICommunityPlatformModerationActionOnCommunity>(communityAction);

  const header = communityAction.moderation_action;
  typia.assert<ICommunityPlatformModerationAction>(header);

  TestValidator.equals(
    "community view moderation_action.id should match created action id",
    header.id,
    createdAction.id,
  );
  TestValidator.equals(
    "community view moderation_action.action_type should match",
    header.action_type,
    actionType,
  );
  TestValidator.equals(
    "community view moderation_action.scope should be community",
    header.scope,
    scope,
  );
  TestValidator.equals(
    "community view moderation_action.reason_category should match",
    header.reason_category,
    reasonCategory,
  );
  TestValidator.equals(
    "community view moderation_action.reason_detail should match",
    header.reason_detail,
    reasonDetail,
  );

  // 5. Validate target community linkage
  const targetCommunityId: string & tags.Format<"uuid"> =
    communityAction.target_community_id;
  const targetCommunity: ICommunityPlatformCommunity.ISummary =
    communityAction.target_community;
  typia.assert<string & tags.Format<"uuid">>(targetCommunityId);
  typia.assert<ICommunityPlatformCommunity.ISummary>(targetCommunity);

  TestValidator.equals(
    "target_community_id should match target_community.id",
    targetCommunity.id,
    targetCommunityId,
  );

  // 6. Validate absence of account restriction
  TestValidator.predicate(
    "moderation_action.account_restriction should be null or undefined when not linked",
    header.account_restriction === null ||
      header.account_restriction === undefined,
  );
}
