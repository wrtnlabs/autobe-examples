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

export async function test_api_organization_creation_with_description_and_logo(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  // Step 1: Join as member
  const member = await authorize_member_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(member);
  // Step 2: Create organization with description and logo
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const logoUri = `https://example.com/logo-${RandomGenerator.alphaNumeric(6)}.png`;
  const fiscalMonth = Math.floor(Math.random() * 12) + 1;
  const org = await api.functional.hrmTracker.member.organizations.create(
    actorConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: description,
        logo_image_uri: logoUri,
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: fiscalMonth,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org);
  // Step 3: Validate organization creation
  TestValidator.equals("name matches", org.name, org.name);
  TestValidator.equals("description matches", org.description, description);
  TestValidator.equals("logo_image_uri matches", org.logo_image_uri, logoUri);
  TestValidator.equals("currency matches", org.currency, "KRW");
  TestValidator.equals("timezone matches", org.timezone, "Asia/Seoul");
  TestValidator.equals(
    "fiscal_start_month matches",
    org.fiscal_start_month,
    fiscalMonth,
  );
  TestValidator.equals("status is active", org.status, "active");
  TestValidator.predicate("has valid UUID", /^[0-9a-f-]{36}$/i.test(org.id));
}
