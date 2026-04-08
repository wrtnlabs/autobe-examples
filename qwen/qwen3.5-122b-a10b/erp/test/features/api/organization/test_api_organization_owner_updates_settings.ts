import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_owner_updates_settings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Generate random organization ID
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Prepare update payload with all mutable fields
  const updateBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_image_url: typia.random<
      string & tags.Format<"uri"> & tags.MaxLength<80000>
    >(),
    currency: RandomGenerator.alphabets(3).toUpperCase() as string &
      tags.MaxLength<3>,
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmOrganization.IUpdate;
  // 4. Update organization settings
  const updated: IHrmOrganization =
    await api.functional.hrm.member.organizations.update(memberConnection, {
      organizationId,
      body: updateBody,
    });
  typia.assert(updated);
  // 5. Validate response structure
  TestValidator.equals("organization ID matches", updated.id, organizationId);
  TestValidator.equals("name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "logo URL updated",
    updated.logo_image_url,
    updateBody.logo_image_url as string | null | undefined,
  );
  TestValidator.equals(
    "currency updated",
    updated.currency,
    updateBody.currency,
  );
  TestValidator.equals(
    "timezone updated",
    updated.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "fiscal month updated",
    updated.fiscal_start_month,
    updateBody.fiscal_start_month,
  );
  // 6. Verify timestamp updates
  TestValidator.predicate("created_at exists", updated.created_at !== null);
  TestValidator.predicate("updated_at exists", updated.updated_at !== null);
}
