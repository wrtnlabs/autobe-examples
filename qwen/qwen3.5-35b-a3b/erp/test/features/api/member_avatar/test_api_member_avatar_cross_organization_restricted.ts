import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IAvatarImageResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAvatarImageResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_avatar_cross_organization_restricted(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create two members (simulating different organizations)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IHrmsMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IHrmsMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(memberB);
  // Test: Member A attempts to access Member B's avatar (cross-organization)
  // This should fail with 403 Forbidden or 404 Not Found
  await TestValidator.httpError(
    "member cannot access avatar from another organization",
    [403, 404],
    async () => {
      await api.functional.hrms.member.avatar.get(memberAConnection, {
        userId: memberB.id,
      });
    },
  );
}
