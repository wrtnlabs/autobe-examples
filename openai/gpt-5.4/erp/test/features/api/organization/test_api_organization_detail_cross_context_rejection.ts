import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_organization_detail_cross_context_rejection(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {});
  typia.assert(authorized);
  TestValidator.equals(
    "owner authorization header established",
    ownerConnection.headers?.Authorization,
    authorized.token.access,
  );
  const foreignOrganizationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "owner cannot read organization outside active organization context",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.at(
        ownerConnection,
        {
          organizationId: foreignOrganizationId,
        },
      );
    },
  );
}
