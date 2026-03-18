import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOwnerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_session_organization_scope_rejection(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {});
  typia.assert(authorized);
  const request = {
    actorType: "owner",
    organizationId: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingOwnerSession.IRequest;
  await TestValidator.httpError(
    "reject out-of-scope organization session search",
    403,
    async () => {
      await api.functional.hrmTimeTracking.owner.sessions.index(
        ownerConnection,
        {
          body: request,
        },
      );
    },
  );
}
