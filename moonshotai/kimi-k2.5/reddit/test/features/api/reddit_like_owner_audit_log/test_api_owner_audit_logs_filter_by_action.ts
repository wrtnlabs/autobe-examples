import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwnerAuditLog";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Test filtering audit logs by specific action type.
 * 1. Create a member and authenticate
 * 2. Create an owner and authenticate
 * 3. Member creates a community (generates 'create_community' audit log)
 * 4. Owner adds a moderator to the community (generates 'add_moderator' audit log)
 * 5. Filter audit logs by 'add_moderator' action
 * 6. Validate filtered results only contain matching actions
 * 7. Verify pagination metadata reflects filtered count
 * 8. Test filtering by 'create_community' action
 */
export async function test_api_owner_audit_logs_filter_by_action(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: {} },
  );
  typia.assert(memberAuth);
  // Step 2: Create owner connection and join
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: IRedditLikeOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    { body: {} },
  );
  typia.assert(ownerAuth);
  // Step 3: Member creates a community (generates audit log entry)
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // Step 4: Owner adds a moderator to the community (generates 'add_moderator' audit log)
  // First we need another member to be the moderator
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorMemberAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(moderatorMemberConnection, { body: {} });
  typia.assert(moderatorMemberAuth);
  // Owner adds the new member as moderator
  const moderator: IRedditLikeModerator =
    await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
      body: {
        communityId: community.id,
        memberId: moderatorMemberAuth.id,
        canAddModerators: false,
      },
    });
  typia.assert(moderator);
  // Step 5: Filter audit logs by 'add_moderator' action
  const addModeratorFilter: IRedditLikeOwnerAuditLog.IRequest = {
    action: "add_moderator",
    limit: 10,
  } satisfies IRedditLikeOwnerAuditLog.IRequest;
  const addModeratorResult: IPageIRedditLikeOwnerAuditLog.ISummary =
    await api.functional.redditLike.owner.audit_logs.index(ownerConnection, {
      body: addModeratorFilter,
    });
  typia.assert(addModeratorResult);
  // Step 6: Validate filtered results only contain 'add_moderator' actions
  TestValidator.predicate(
    "all filtered entries have action 'add_moderator'",
    addModeratorResult.data.every((log) => log.action === "add_moderator"),
  );
  TestValidator.predicate(
    "filtered results contain at least one entry",
    addModeratorResult.data.length > 0,
  );
  // Step 7: Verify pagination metadata reflects filtered count
  TestValidator.predicate(
    "pagination records matches filtered data count",
    addModeratorResult.pagination.records === addModeratorResult.data.length,
  );
  // Step 8: Filter by 'create_community' action and validate
  const createCommunityFilter: IRedditLikeOwnerAuditLog.IRequest = {
    action: "create_community",
    limit: 10,
  } satisfies IRedditLikeOwnerAuditLog.IRequest;
  const createCommunityResult: IPageIRedditLikeOwnerAuditLog.ISummary =
    await api.functional.redditLike.owner.audit_logs.index(ownerConnection, {
      body: createCommunityFilter,
    });
  typia.assert(createCommunityResult);
  // Validate 'create_community' filtered results
  TestValidator.predicate(
    "all filtered entries have action 'create_community'",
    createCommunityResult.data.every(
      (log) => log.action === "create_community",
    ),
  );
  TestValidator.predicate(
    "create_community filter returns at least one entry",
    createCommunityResult.data.length > 0,
  );
  // Verify pagination metadata for create_community filter
  TestValidator.predicate(
    "create_community pagination records matches filtered data count",
    createCommunityResult.pagination.records ===
      createCommunityResult.data.length,
  );
}
