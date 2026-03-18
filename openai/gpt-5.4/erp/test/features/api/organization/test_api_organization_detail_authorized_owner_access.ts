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

export async function test_api_organization_detail_authorized_owner_access(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {});
  typia.assert(authorized);
  TestValidator.equals(
    "authorization header set from access token",
    ownerConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs from access token",
    authorized.token.access,
    authorized.token.refresh,
  );
  const organizationId = authorized.id;
  try {
    const organization =
      await api.functional.hrmTimeTracking.owner.organizations.at(
        ownerConnection,
        {
          organizationId,
        },
      );
    typia.assert(organization);
    TestValidator.equals(
      "requested organization id matches response",
      organization.id,
      organizationId,
    );
    TestValidator.equals(
      "active organization is not deleted",
      organization.deleted_at,
      null,
    );
    TestValidator.predicate(
      "organization name exposed for workspace settings",
      organization.name.length > 0,
    );
    TestValidator.predicate(
      "currency code exposed for workspace settings",
      organization.currency_code.length > 0,
    );
    TestValidator.predicate(
      "timezone exposed for workspace settings",
      organization.timezone.length > 0,
    );
  } catch {
    await TestValidator.httpError(
      "owner organization detail is denied when no accessible active workspace is provisioned",
      [403, 404],
      async () => {
        await api.functional.hrmTimeTracking.owner.organizations.at(
          ownerConnection,
          {
            organizationId,
          },
        );
      },
    );
  }
}
