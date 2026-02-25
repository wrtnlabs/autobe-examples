import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic search functionality for community invitations without filters.
 * Validates pagination metadata and record completeness for invitation summaries.
 */
export async function test_api_community_invitations_admin_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Search invitations without filters (basic search)
  const searchRequest: ICommunityPlatformCommunityInvitation.IRequest = {
    // No filters applied for basic search
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  // Note: Since we don't have community creation API, we'll test with a random communityId
  // This may result in empty results or error, which is acceptable for basic search testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      adminConnection,
      {
        communityId,
        body: searchRequest,
      },
    );
  // 3. Validate response structure - typia.assert performs complete validation
  typia.assert(response);
  // 4. Validate pagination metadata calculations
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation should match",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array is properly structured (typia.assert already validated types)
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );
  // 6. Validate each invitation record structure (typia.assert already validated types)
  // We only need to validate business logic, not types
  for (const invitation of response.data) {
    typia.assert(invitation);
    // Business logic validation: community ID should match the requested community
    TestValidator.equals(
      "community ID should match request",
      invitation.community.id,
      communityId,
    );
    // Business logic: expiration date should be after creation date
    const createdAt = new Date(invitation.created_at);
    const expiresAt = new Date(invitation.expires_at);
    TestValidator.predicate(
      "expiration should be after creation",
      expiresAt > createdAt,
    );
  }
}
