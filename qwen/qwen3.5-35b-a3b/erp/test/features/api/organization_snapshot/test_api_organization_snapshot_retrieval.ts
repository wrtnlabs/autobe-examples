import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_snapshots_create } from "../../../generate/generate_random_hrm_platform_member_organizations_snapshots_create";
import { prepare_random_hrm_platform_organizations_snapshot } from "../../../prepare/prepare_random_hrm_platform_organizations_snapshot";

export async function test_api_organization_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.paragraph({ sentences: 2 }),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract organization ID from member's session
  const organizationId = authorized.sessions?.[0]?.organization?.id;
  TestValidator.notEquals(
    "organization exists in session",
    organizationId,
    null,
  );
  typia.assert(organizationId);
  // 3. Create organization snapshot
  const snapshotConnection: api.IConnection = { host: connection.host };
  const createdSnapshot =
    await api.functional.hrmPlatform.member.organizations.snapshots.create(
      snapshotConnection,
      {
        organizationId: organizationId!,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph(),
          logo_uri: typia.assert<string & tags.MaxLength<80000>>(
            typia.random<string & tags.Format<"uri">>(),
          ),
          currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
          timezone: RandomGenerator.pick([
            "UTC",
            "Asia/Seoul",
            "America/New_York",
          ]),
          fiscal_start_month: RandomGenerator.pick([1, 4, 7, 10]),
          status: RandomGenerator.pick(["active", "suspended", "archived"]),
          metadata: typia.random<string & tags.MaxLength<80000>>(),
        } satisfies IHrmPlatformOrganizationsSnapshot.ICreate,
      },
    );
  typia.assert(createdSnapshot);
  // 4. Retrieve the snapshot
  const retrievedSnapshot =
    await api.functional.hrmPlatform.member.organizations.snapshots.at(
      snapshotConnection,
      {
        organizationId: organizationId!,
        snapshotId: createdSnapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate response fields
  TestValidator.equals(
    "snapshot id matches",
    retrievedSnapshot.id,
    createdSnapshot.id,
  );
  TestValidator.equals(
    "organization id matches",
    retrievedSnapshot.hrm_platform_organization_id,
    organizationId!,
  );
  TestValidator.equals(
    "name preserved",
    retrievedSnapshot.name,
    createdSnapshot.name,
  );
  TestValidator.equals(
    "description preserved",
    retrievedSnapshot.description,
    createdSnapshot.description,
  );
  TestValidator.equals(
    "logo_uri preserved",
    retrievedSnapshot.logo_uri,
    createdSnapshot.logo_uri,
  );
  TestValidator.equals(
    "currency preserved",
    retrievedSnapshot.currency,
    createdSnapshot.currency,
  );
  TestValidator.equals(
    "timezone preserved",
    retrievedSnapshot.timezone,
    createdSnapshot.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month preserved",
    retrievedSnapshot.fiscal_start_month,
    createdSnapshot.fiscal_start_month,
  );
  TestValidator.equals(
    "status preserved",
    retrievedSnapshot.status,
    createdSnapshot.status,
  );
  TestValidator.equals(
    "metadata preserved",
    retrievedSnapshot.metadata,
    createdSnapshot.metadata,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    !!(retrievedSnapshot.created_at as string),
  );
}
