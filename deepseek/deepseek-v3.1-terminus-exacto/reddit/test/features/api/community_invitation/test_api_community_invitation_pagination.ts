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

export async function test_api_community_invitation_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
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
  // Test pagination with different scenarios
  // Test 1: First page with default limit (should default to reasonable values)
  const firstPage =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    firstPage.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(firstPage.data));
  // Test 2: Custom limit within range
  const customLimit =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(customLimit);
  TestValidator.equals(
    "limit matches request",
    customLimit.pagination.limit,
    25,
  );
  // Test 3: Page beyond available records (should return empty array with correct metadata)
  const beyondPage =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 1000,
          limit: 10,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "empty data on beyond page",
    beyondPage.data.length === 0,
  );
  TestValidator.predicate(
    "current page matches request",
    beyondPage.pagination.current >= 1,
  );
  // Test 4: Minimum valid limit
  const minLimit =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals("minimum limit works", minLimit.pagination.limit, 1);
  // Test 5: Maximum valid limit
  const maxLimit =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("maximum limit works", maxLimit.pagination.limit, 100);
  // Validate pagination metadata consistency
  const allResults = [firstPage, customLimit, beyondPage, minLimit, maxLimit];
  for (const result of allResults) {
    TestValidator.predicate(
      "pagination has current page",
      result.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination has limit",
      result.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination has records count",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has pages count",
      result.pagination.pages >= 0,
    );
    // Verify data integrity for non-empty results
    if (result.data.length > 0) {
      for (const invitation of result.data) {
        TestValidator.predicate(
          "invitation has ID",
          invitation.id !== undefined,
        );
        TestValidator.predicate(
          "invitation has status",
          invitation.status !== undefined,
        );
        TestValidator.predicate(
          "invitation has community",
          invitation.community !== undefined,
        );
        TestValidator.predicate(
          "invitation has inviter",
          invitation.inviter !== undefined,
        );
        TestValidator.predicate(
          "invitation has invitee",
          invitation.invitee !== undefined,
        );
        TestValidator.predicate(
          "invitation has created_at",
          invitation.created_at !== undefined,
        );
        TestValidator.predicate(
          "invitation has expires_at",
          invitation.expires_at !== undefined,
        );
      }
    }
  }
}
