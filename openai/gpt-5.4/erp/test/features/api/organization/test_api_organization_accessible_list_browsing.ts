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

export async function test_api_organization_accessible_list_browsing(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const request = {
    page: 1,
    limit: 10,
    search: RandomGenerator.paragraph({ sentences: 2 }),
    sort: "+created_at",
    deleted_at: null,
  } satisfies IHrmTimeTrackingOrganization.IRequest;
  const result = await api.functional.hrmTimeTracking.owner.organizations.index(
    ownerConnection,
    {
      body: request,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "pagination current matches requested page",
    result.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    result.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages matches records and limit",
    result.pagination.pages,
    result.pagination.limit === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit),
  );
  TestValidator.predicate(
    "current page is coherent with total pages",
    result.pagination.pages === 0 ||
      (result.pagination.current >= 1 &&
        result.pagination.current <= result.pagination.pages),
  );
  TestValidator.predicate(
    "data length does not exceed page limit",
    result.data.length <= result.pagination.limit,
  );
  const ids = result.data.map((organization) => organization.id);
  TestValidator.equals(
    "organization ids are unique within page",
    new Set(ids).size,
    ids.length,
  );
  for (const organization of result.data) {
    TestValidator.predicate(
      "organization name is not empty",
      organization.name.length > 0,
    );
    TestValidator.predicate(
      "fiscal start month is in range",
      organization.fiscal_start_month >= 1 &&
        organization.fiscal_start_month <= 12,
    );
    TestValidator.predicate(
      "created_at is a valid datetime",
      Number.isNaN(new Date(organization.created_at).getTime()) === false,
    );
    TestValidator.predicate(
      "updated_at is a valid datetime",
      Number.isNaN(new Date(organization.updated_at).getTime()) === false,
    );
  }
  for (let i = 1; i < result.data.length; ++i) {
    const previous = result.data[i - 1];
    const current = result.data[i];
    const previousTime = new Date(previous.created_at).getTime();
    const currentTime = new Date(current.created_at).getTime();
    TestValidator.predicate(
      `organizations are sorted deterministically at index ${i}`,
      previousTime < currentTime ||
        (previousTime === currentTime && previous.id <= current.id),
    );
  }
}
