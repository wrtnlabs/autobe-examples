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
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_owner_detail_cross_organization_hidden(
  connection: api.IConnection,
): Promise<void> {
  const firstOwnerConnection: api.IConnection = { host: connection.host };
  const firstOwnerAuth = await authorize_owner_join(firstOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(firstOwnerAuth);
  const firstOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      firstOwnerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(firstOrganization);
  const secondOwnerConnection: api.IConnection = { host: connection.host };
  const secondOwnerAuth = await authorize_owner_join(secondOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(secondOwnerAuth);
  const secondOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      secondOwnerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 12,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  TestValidator.notEquals(
    "organizations are isolated",
    firstOrganization.id,
    secondOrganization.id,
  );
  TestValidator.notEquals(
    "owners are distinct",
    firstOwnerAuth.id,
    secondOwnerAuth.id,
  );
  await TestValidator.httpError(
    "cross-organization owner detail is hidden",
    404,
    async () => {
      await api.functional.hrmTimeTracking.owners.at(firstOwnerConnection, {
        ownerId: secondOwnerAuth.id,
      });
    },
  );
}
