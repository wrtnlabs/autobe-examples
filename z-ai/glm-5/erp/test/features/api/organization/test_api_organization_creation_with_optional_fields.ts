import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization with populated optional fields
  const descriptionValue = RandomGenerator.paragraph({ sentences: 3 });
  const logoImageValue = typia.random<string & tags.Format<"url">>();
  const organizationWithOptionals =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: descriptionValue,
          logoImage: logoImageValue,
          currency: "USD",
          timezone: "America/New_York",
          fiscalStartMonth: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organizationWithOptionals);
  // Verify populated optional fields are stored correctly
  TestValidator.equals(
    "description matches",
    organizationWithOptionals.description,
    descriptionValue,
  );
  TestValidator.equals(
    "logoImage matches",
    organizationWithOptionals.logoImage,
    logoImageValue,
  );
  // 3. Create organization with null optional fields
  const organizationWithNulls =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: null,
          logoImage: null,
          currency: "EUR",
          timezone: "Asia/Seoul",
          fiscalStartMonth: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organizationWithNulls);
  // Verify null optional fields are stored correctly
  TestValidator.equals(
    "description is null",
    organizationWithNulls.description,
    null,
  );
  TestValidator.equals(
    "logoImage is null",
    organizationWithNulls.logoImage,
    null,
  );
}
