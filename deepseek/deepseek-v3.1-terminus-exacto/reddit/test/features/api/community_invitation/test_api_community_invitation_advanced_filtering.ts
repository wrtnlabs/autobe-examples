import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test advanced filtering capabilities for community invitations.
 * As an authenticated moderator, search for invitations within a community
 * using multiple filter criteria including status, user relationships,
 * date ranges, and message text.
 */
export async function test_api_community_invitation_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as moderator
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Create a community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Filter by status 'pending'
  const pendingResponse =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Test 2: Filter by specific inviter
  const inviterId = typia.random<string & tags.Format<"uuid">>();
  const inviterResponse =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          inviter_id: inviterId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(inviterResponse);
  // Test 3: Filter by specific invitee
  const inviteeId = typia.random<string & tags.Format<"uuid">>();
  const inviteeResponse =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          invitee_id: inviteeId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(inviteeResponse);
  // Test 4: Filter by date ranges
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResponse =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          created_at_start: yesterday,
          created_at_end: tomorrow,
          expires_at_start: yesterday,
          expires_at_end: tomorrow,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test 5: Filter by message text
  const messageResponse =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          message: "welcome",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(messageResponse);
  // Test 6: Combined filters
  const combinedResponse =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "accepted",
          inviter_id: inviterId,
          created_at_start: yesterday,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Test 7: Edge case - null status
  const nullStatusResponse =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(nullStatusResponse);
  // Test 8: Edge case - expired invitations
  const expiredResponse =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(expiredResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    pendingResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    pendingResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    pendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    pendingResponse.pagination.pages >= 0,
  );
}
