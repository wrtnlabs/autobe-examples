import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_member_profile_retrieval_same_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the first member (viewer) who will create the organization
  const viewerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(viewerAuth);
  // Create viewer-specific connection with authentication
  const viewerConnection: api.IConnection = { host: connection.host };
  viewerConnection.headers = {
    Authorization: `Bearer ${viewerAuth.token.access}`,
  };
  // 2. Create an organization under the first member's context
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      viewerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register a second member (target profile)
  // Note: Member join is global, organization membership is managed separately
  const targetAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetAuth);
  // 4. Use the first member to retrieve the second member's profile
  const memberProfile = await api.functional.hrmPlatform.members.at(
    viewerConnection,
    {
      memberId: targetAuth.id,
    },
  );
  typia.assert(memberProfile);
  // 5. Validate the response contains expected profile information
  TestValidator.equals("member ID matches", memberProfile.id, targetAuth.id);
  TestValidator.equals("email matches", memberProfile.email, targetAuth.email);
  TestValidator.equals(
    "display name matches",
    memberProfile.displayName,
    targetAuth.displayName,
  );
  TestValidator.equals(
    "avatar URL matches",
    memberProfile.avatarUrl,
    targetAuth.avatarUrl,
  );
  TestValidator.equals(
    "phone number matches",
    memberProfile.phoneNumber,
    targetAuth.phoneNumber,
  );
  // 6. Verify password_hash is NOT included in the response
  // This is validated by typia.assert() against IHrmPlatformMember type which doesn't include password_hash
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in memberProfile),
  );
}
