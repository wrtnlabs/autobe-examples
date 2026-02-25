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

export async function test_api_community_invitation_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
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
  // 2. Generate a random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Search for invitations without any filters (basic search)
  const response =
    await api.functional.communityPlatform.moderator.communities.invitations.index(
      moderatorConnection,
      {
        communityId,
        body: {
          // Provide explicit null values for optional fields to satisfy type constraints
          status: null,
          inviter_id: undefined,
          invitee_id: undefined,
          message: null,
          created_at_start: undefined,
          created_at_end: undefined,
          expires_at_start: undefined,
          expires_at_end: undefined,
          page: undefined,
          limit: undefined,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  // 4. Validate the response structure - typia.assert performs complete validation
  typia.assert(response);
  // 5. Validate pagination business logic
  TestValidator.predicate(
    "pagination metadata is consistent",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      response.pagination.records === 0,
  );
  TestValidator.predicate(
    "current page is within valid range",
    response.pagination.current >= 0 &&
      response.pagination.current <= response.pagination.pages,
  );
  // 6. Validate data array business logic
  TestValidator.equals(
    "data array length matches pagination records",
    response.data.length,
    Math.min(response.pagination.limit, response.pagination.records),
  );
  // 7. Validate invitation business logic if invitations exist
  if (response.data.length > 0) {
    const invitation = response.data[0];
    // Business logic validation - not type validation
    TestValidator.equals(
      "community ID in invitation matches search parameter",
      invitation.community.id,
      communityId,
    );
    TestValidator.predicate(
      "invitation status is valid",
      ["pending", "accepted", "rejected", "expired"].includes(
        invitation.status,
      ),
    );
    TestValidator.predicate(
      "expiration date is in the future or past based on status",
      invitation.status === "expired"
        ? new Date(invitation.expires_at) < new Date()
        : new Date(invitation.expires_at) > new Date(),
    );
  }
}
