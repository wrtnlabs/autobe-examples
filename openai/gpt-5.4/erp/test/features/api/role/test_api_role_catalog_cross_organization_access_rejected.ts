import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_role_catalog_cross_organization_access_rejected(
  connection: api.IConnection,
): Promise<void> {
  const firstOwnerConnection: api.IConnection = {
    host: connection.host,
  };
  const firstOwnerAuth = await authorize_owner_join(firstOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstOwnerAuth);
  const secondOwnerConnection: api.IConnection = {
    host: connection.host,
  };
  const secondOwnerAuth = await authorize_owner_join(secondOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondOwnerAuth);
  const firstOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      firstOwnerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >() satisfies number as number,
        },
      },
    );
  typia.assert(firstOrganization);
  const secondOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      secondOwnerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >() satisfies number as number,
        },
      },
    );
  typia.assert(secondOrganization);
  TestValidator.notEquals(
    "organizations must be isolated",
    firstOrganization.id,
    secondOrganization.id,
  );
  TestValidator.notEquals(
    "owners must be different",
    firstOwnerAuth.id,
    secondOwnerAuth.id,
  );
  const request = {} satisfies IHrmTimeTrackingRole.IRequest;
  await TestValidator.httpError(
    "cross-organization role catalog access must be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.index(
        secondOwnerConnection,
        {
          organizationId: firstOrganization.id,
          body: request,
        },
      );
    },
  );
}
