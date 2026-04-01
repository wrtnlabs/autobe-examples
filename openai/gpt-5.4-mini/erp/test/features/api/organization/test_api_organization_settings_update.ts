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

export async function test_api_organization_settings_update(
  connection: api.IConnection,
): Promise<void> {
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const initialName = RandomGenerator.name();
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const initialLogo = "https://example.com/logo.svg";
  const updated =
    await api.functional.erpHrmTime.member.organizations.putByOrganizationid(
      connection,
      {
        organizationId,
        body: {
          name: initialName,
          description: initialDescription,
          logoImageUrl: initialLogo,
        } satisfies IErpHrmTimeOrganization.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("organization name updated", updated.name, initialName);
  TestValidator.equals(
    "organization description updated",
    updated.description,
    initialDescription,
  );
  TestValidator.equals(
    "organization logo updated",
    updated.logoImageUrl,
    initialLogo,
  );
  const nextName = RandomGenerator.name();
  const renamed =
    await api.functional.erpHrmTime.member.organizations.putByOrganizationid(
      connection,
      {
        organizationId,
        body: {
          name: nextName,
        } satisfies IErpHrmTimeOrganization.IUpdate,
      },
    );
  typia.assert(renamed);
  TestValidator.equals(
    "organization name changed only",
    renamed.name,
    nextName,
  );
  TestValidator.equals(
    "organization description preserved",
    renamed.description,
    initialDescription,
  );
  TestValidator.equals(
    "organization logo preserved",
    renamed.logoImageUrl,
    initialLogo,
  );
  const cleared =
    await api.functional.erpHrmTime.member.organizations.putByOrganizationid(
      connection,
      {
        organizationId,
        body: {
          description: null,
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.IUpdate,
      },
    );
  typia.assert(cleared);
  TestValidator.equals(
    "organization description cleared",
    cleared.description,
    null,
  );
  TestValidator.equals("organization logo cleared", cleared.logoImageUrl, null);
  TestValidator.equals(
    "organization name preserved after clearing other fields",
    cleared.name,
    nextName,
  );
}
