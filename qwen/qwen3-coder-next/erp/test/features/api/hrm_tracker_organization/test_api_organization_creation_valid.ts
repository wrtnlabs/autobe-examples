import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_organization_creation_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member (actor setup)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization with all required fields
  const name = RandomGenerator.paragraph({ sentences: 1 });
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      memberConnection,
      {
        body: {
          name,
          description,
          logo_image_uri: null,
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Validate organization data matches request
  TestValidator.equals(
    "organization name matches request",
    organization.name,
    name,
  );
  TestValidator.equals(
    "organization description matches request",
    organization.description,
    description,
  );
  TestValidator.equals(
    "organization logo_image_uri matches request",
    organization.logo_image_uri,
    null,
  );
  TestValidator.equals(
    "organization currency matches request",
    organization.currency,
    "KRW",
  );
  TestValidator.equals(
    "organization timezone matches request",
    organization.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "organization fiscal_start_month matches request",
    organization.fiscal_start_month,
    1,
  );
  TestValidator.equals(
    "organization status exists",
    typeof organization.status,
    "string",
  );
  TestValidator.predicate(
    "organization created_at is date-time",
    organization.created_at !== null && organization.created_at !== undefined,
  );
  TestValidator.predicate(
    "organization updated_at is date-time",
    organization.updated_at !== null && organization.updated_at !== undefined,
  );
  TestValidator.equals(
    "organization deleted_at is null",
    organization.deleted_at,
    null,
  );
}
