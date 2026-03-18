import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_organization_membership_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const request = {
    search: RandomGenerator.paragraph({ sentences: 3 }),
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    sort: "+name",
    deleted_at: null,
  } satisfies IHrmTimeTrackingOrganization.IRequest;
  const page = await api.functional.hrmTimeTracking.owner.organizations.index(
    ownerConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current echoes requested page",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit echoes requested limit",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned rows do not exceed page limit",
    page.data.length <= page.pagination.limit,
  );
  const uniqueIds = new Set(page.data.map((org) => org.id));
  TestValidator.equals(
    "returned organizations have unique ids",
    uniqueIds.size,
    page.data.length,
  );
  for (const organization of page.data) {
    TestValidator.predicate(
      "organization name is populated",
      organization.name.length > 0,
    );
    TestValidator.predicate(
      "organization currency code is populated",
      organization.currency_code.length > 0,
    );
    TestValidator.predicate(
      "organization timezone is populated",
      organization.timezone.length > 0,
    );
    TestValidator.predicate(
      "organization fiscal start month is in valid range",
      organization.fiscal_start_month >= 1 &&
        organization.fiscal_start_month <= 12,
    );
  }
}
