import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_roles_create } from "../../../generate/generate_random_hrm_member_organizations_roles_create";
import { prepare_random_hrm_role } from "../../../prepare/prepare_random_hrm_role";

export async function test_api_role_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Generate organization ID (UUID)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create first custom role with unique name
  const roleName: string = RandomGenerator.name();
  const firstRole: IHrmRole =
    await generate_random_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: roleName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmRole.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(firstRole);
  TestValidator.equals("role name matches", firstRole.name, roleName);
  // 4. Attempt to create second role with same name - should fail with 409
  await TestValidator.httpError(
    "duplicate role name should return 409 Conflict",
    409,
    async () => {
      await generate_random_hrm_member_organizations_roles_create(
        memberConnection,
        {
          body: {
            name: roleName, // Same name as first role
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IHrmRole.ICreate,
          params: {
            organizationId,
          },
        },
      );
    },
  );
}
