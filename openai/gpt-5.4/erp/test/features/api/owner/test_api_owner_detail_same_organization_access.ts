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

export async function test_api_owner_detail_same_organization_access(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const join = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert<IHrmTimeTrackingOwner.IAuthorized>(join);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
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
  typia.assert<IHrmTimeTrackingOrganization>(organization);
  const owner = await api.functional.hrmTimeTracking.owners.at(
    ownerConnection,
    {
      ownerId: join.id,
    },
  );
  typia.assert<IHrmTimeTrackingOwner>(owner);
  typia.assertEquals<IHrmTimeTrackingOwner>(owner);
  TestValidator.equals(
    "detail owner id matches authenticated owner",
    owner.id,
    join.id,
  );
  TestValidator.equals(
    "detail owner email matches authenticated owner",
    owner.email,
    join.email,
  );
  TestValidator.equals(
    "detail owner last_login_at matches authorized payload",
    owner.last_login_at,
    join.last_login_at,
  );
  TestValidator.equals(
    "detail owner deactivated_at matches authorized payload",
    owner.deactivated_at,
    join.deactivated_at,
  );
  TestValidator.equals(
    "detail owner created_at matches authorized payload",
    owner.created_at,
    join.created_at,
  );
  TestValidator.equals(
    "detail owner updated_at matches authorized payload",
    owner.updated_at,
    join.updated_at,
  );
  TestValidator.equals(
    "detail owner deleted_at matches authorized payload",
    owner.deleted_at,
    join.deleted_at,
  );
  TestValidator.equals(
    "created organization remains active",
    organization.deleted_at,
    null,
  );
}
