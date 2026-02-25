import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_invitations_create } from "../../../generate/generate_random_community_platform_admin_communities_invitations_create";
import { prepare_random_community_platform_community_invitation } from "../../../prepare/prepare_random_community_platform_community_invitation";

/**
 * Test admin successfully creates community invitation with valid invitee_id and optional message.
 * Verify authorization by admin role through authentication token.
 *
 * Note: This test assumes prerequisite data exists (community and invitee user).
 * Since creation APIs for these resources are not provided, we use random IDs
 * and test the invitation creation logic and authorization validation.
 */
export async function test_api_community_invitation_admin_creates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user and obtain admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Use random community ID (assuming community exists for successful test)
  // In real environment, this would be replaced with actual community creation
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Use random invitee ID (assuming user exists for successful test)
  const inviteeId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create invitation with message
  const invitationWithMessage =
    await api.functional.communityPlatform.admin.communities.invitations.create(
      adminConnection,
      {
        communityId,
        body: {
          invitee_id: inviteeId,
          message: "Welcome to our community!",
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
      },
    );
  typia.assert(invitationWithMessage);
  // Validate invitation properties
  TestValidator.equals(
    "status should be pending",
    invitationWithMessage.status,
    "pending",
  );
  TestValidator.predicate(
    "expires_at should be in future",
    new Date(invitationWithMessage.expires_at) > new Date(),
  );
  TestValidator.equals(
    "community.id should match input",
    invitationWithMessage.community.id,
    communityId,
  );
  TestValidator.equals(
    "inviter.id should match admin id",
    invitationWithMessage.inviter.id,
    admin.id,
  );
  TestValidator.equals(
    "invitee.id should match invitee_id",
    invitationWithMessage.invitee.id,
    inviteeId,
  );
  TestValidator.equals(
    "message should match input",
    invitationWithMessage.message,
    "Welcome to our community!",
  );
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(new Date(invitationWithMessage.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(new Date(invitationWithMessage.updated_at).getTime()),
  );
  // 5. Create invitation without message (different invitee to avoid duplicate constraints)
  const anotherInviteeId = typia.random<string & tags.Format<"uuid">>();
  const invitationWithoutMessage =
    await api.functional.communityPlatform.admin.communities.invitations.create(
      adminConnection,
      {
        communityId,
        body: {
          invitee_id: anotherInviteeId,
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
      },
    );
  typia.assert(invitationWithoutMessage);
  TestValidator.equals(
    "status should be pending (no message)",
    invitationWithoutMessage.status,
    "pending",
  );
  TestValidator.equals(
    "message should be null when not provided",
    invitationWithoutMessage.message,
    null,
  );
  TestValidator.equals(
    "community.id should match input (no message)",
    invitationWithoutMessage.community.id,
    communityId,
  );
  TestValidator.equals(
    "inviter.id should match admin id (no message)",
    invitationWithoutMessage.inviter.id,
    admin.id,
  );
  TestValidator.equals(
    "invitee.id should match invitee_id (no message)",
    invitationWithoutMessage.invitee.id,
    anotherInviteeId,
  );
}
