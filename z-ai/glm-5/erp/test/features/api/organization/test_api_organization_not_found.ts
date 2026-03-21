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

export async function test_api_organization_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a valid UUID that doesn't exist in the system
  const nonExistentOrganizationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent organization and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent organization",
    404,
    async () => {
      await api.functional.erpHrm.member.organizations.at(memberConnection, {
        organizationId: nonExistentOrganizationId,
      });
    },
  );
}
