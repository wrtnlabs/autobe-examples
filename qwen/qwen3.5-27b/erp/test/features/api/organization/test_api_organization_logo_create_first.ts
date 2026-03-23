import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_logo_create_first(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Generate test organization ID (assuming organization exists in test environment)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Prepare logo update request
  const imageUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  // 4. Create logo for the organization
  const logo =
    await api.functional.hrmPlatform.member.organizations.logo.update(
      memberConnection,
      {
        organizationId,
        body: {
          image_url: imageUrl,
        },
      },
    );
  typia.assert(logo);
  // 5. Validate logo is associated with correct organization
  TestValidator.equals(
    "logo associated with correct organization",
    logo.organization.id,
    organizationId,
  );
  // 6. Validate logo has the image URL we provided
  TestValidator.equals("logo has correct image URL", logo.image_url, imageUrl);
  // 7. Verify logo is active (not deleted)
  TestValidator.equals("logo is active (not deleted)", logo.deleted_at, null);
  // 8. Verify timestamps exist and are recent
  const now = new Date();
  const createdAt = new Date(logo.created_at);
  const updatedAt = new Date(logo.updated_at);
  TestValidator.predicate(
    "created_at timestamp is recent",
    Math.abs(now.getTime() - createdAt.getTime()) < 120000,
  );
  TestValidator.predicate(
    "updated_at timestamp is recent",
    Math.abs(now.getTime() - updatedAt.getTime()) < 120000,
  );
  // 9. Verify organization owner reference exists
  TestValidator.predicate(
    "organization has owner reference",
    logo.organization.owner.id !== undefined,
  );
}
