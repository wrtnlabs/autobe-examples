import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
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
import { generate_random_hrm_time_tracking_owner_departments_create } from "../../../generate/generate_random_hrm_time_tracking_owner_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_create_top_level_in_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  const body = {
    name: `dept-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const created: IHrmTimeTrackingDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body,
      },
    );
  typia.assert(created);
  TestValidator.notEquals(
    "department id differs from owner id",
    created.id,
    authorized.id,
  );
  TestValidator.equals("department name echoes input", created.name, body.name);
  TestValidator.equals(
    "department description echoes input",
    created.description,
    body.description ?? null,
  );
  TestValidator.equals(
    "top-level department has null parent",
    created.parent,
    null,
  );
  TestValidator.predicate(
    "organization summary is present in active context",
    created.organization.id.length > 0 && created.organization.name.length > 0,
  );
  TestValidator.notEquals(
    "organization id differs from department id",
    created.organization.id,
    created.id,
  );
  TestValidator.equals("department is not deleted", created.deleted_at, null);
}
