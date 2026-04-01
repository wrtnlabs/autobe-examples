import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";

export async function test_api_organization_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationName: string = `org-${RandomGenerator.alphabets(8)}`;
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const logoImageUrl = "https://example.com/logo.png";
  const firstOrganization =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: organizationName,
          description,
          logoImageUrl,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(firstOrganization);
  TestValidator.equals(
    "created organization name",
    firstOrganization.name,
    organizationName,
  );
  TestValidator.equals(
    "created organization description",
    firstOrganization.description,
    description,
  );
  TestValidator.equals(
    "created organization logo",
    firstOrganization.logoImageUrl,
    logoImageUrl,
  );
  TestValidator.equals(
    "created organization deletedAt",
    firstOrganization.deletedAt,
    null,
  );
  await TestValidator.error(
    "duplicate organization name should be rejected",
    async () => {
      await generate_random_erp_hrm_time_member_organizations_create(
        memberConnection,
        {
          body: {
            name: organizationName,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            logoImageUrl: "https://example.com/another-logo.png",
          } satisfies IErpHrmTimeOrganization.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original organization remains unchanged name",
    firstOrganization.name,
    organizationName,
  );
  TestValidator.equals(
    "original organization remains unchanged description",
    firstOrganization.description,
    description,
  );
  TestValidator.equals(
    "original organization remains unchanged logo",
    firstOrganization.logoImageUrl,
    logoImageUrl,
  );
  TestValidator.equals(
    "original organization remains active",
    firstOrganization.deletedAt,
    null,
  );
}
