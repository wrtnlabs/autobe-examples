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
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_organization_owner_browse_accessible_workspaces(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingOwner.IJoin,
    });
  typia.assert(ownerAuth);
  const namePrefix = `workspace-${RandomGenerator.alphabets(8)}`;
  const matchingCurrencyCode = `CUR-${RandomGenerator.alphabets(3)}`;
  const matchingTimezone = "Asia/Seoul";
  const matchingFiscalStartMonth =
    3 satisfies number as IHrmTimeTrackingOrganization.ICreate["fiscal_start_month"];
  const requestPage = 1 satisfies number as NonNullable<
    IHrmTimeTrackingOrganization.IRequest["page"]
  >;
  const requestLimit = 3 satisfies number as NonNullable<
    IHrmTimeTrackingOrganization.IRequest["limit"]
  >;
  const matchingBodies = ArrayUtil.repeat(requestLimit, (index) => {
    const suffix = `${index + 1}-${RandomGenerator.alphabets(4)}`;
    return {
      name: `${namePrefix}-${suffix}`,
      description: `matched-${RandomGenerator.paragraph({ sentences: 3 })}`,
      logo_uri: `https://example.com/${namePrefix}/${suffix}`,
      currency_code: matchingCurrencyCode,
      timezone: matchingTimezone,
      fiscal_start_month: matchingFiscalStartMonth,
    } satisfies IHrmTimeTrackingOrganization.ICreate;
  });
  const createdMatchingOrganizations = await ArrayUtil.asyncMap(
    matchingBodies,
    async (body) => {
      const created: IHrmTimeTrackingOrganization =
        await generate_random_hrm_time_tracking_owner_organizations_create(
          ownerConnection,
          {
            body,
          },
        );
      typia.assert(created);
      TestValidator.equals(
        "created organization is active",
        created.deleted_at,
        null,
      );
      return created;
    },
  );
  const distractor: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `${namePrefix}-distractor-${RandomGenerator.alphabets(4)}`,
          description: `distractor-${RandomGenerator.paragraph({ sentences: 2 })}`,
          logo_uri: `https://example.com/${namePrefix}/distractor`,
          currency_code: `ALT-${RandomGenerator.alphabets(3)}`,
          timezone: "UTC",
          fiscal_start_month:
            9 satisfies number as IHrmTimeTrackingOrganization.ICreate["fiscal_start_month"],
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(distractor);
  TestValidator.equals(
    "distractor organization is active",
    distractor.deleted_at,
    null,
  );
  const request = {
    page: requestPage,
    limit: requestLimit,
    sort: "+name",
    name: namePrefix,
    currency_code: matchingCurrencyCode,
    timezone: matchingTimezone,
    fiscal_start_month:
      matchingFiscalStartMonth satisfies number as NonNullable<
        IHrmTimeTrackingOrganization.IRequest["fiscal_start_month"]
      >,
    deleted_at: null,
  } satisfies IHrmTimeTrackingOrganization.IRequest;
  const firstPage: IPageIHrmTimeTrackingOrganization.ISummary =
    await api.functional.hrmTimeTracking.owners.index(ownerConnection, {
      body: request,
    });
  typia.assert(firstPage);
  const secondPage: IPageIHrmTimeTrackingOrganization.ISummary =
    await api.functional.hrmTimeTracking.owners.index(ownerConnection, {
      body: request,
    });
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "matching record count",
    firstPage.pagination.records,
    createdMatchingOrganizations.length,
  );
  TestValidator.equals(
    "single page count for exact limit",
    firstPage.pagination.pages,
    1,
  );
  TestValidator.equals(
    "page size equals created matching organizations",
    firstPage.data.length,
    createdMatchingOrganizations.length,
  );
  const expectedById = new Map(
    createdMatchingOrganizations.map((organization) => [
      organization.id,
      organization,
    ]),
  );
  firstPage.data.forEach((summary) => {
    const expected = expectedById.get(summary.id);
    TestValidator.predicate(
      "returned organization belongs to created matching set",
      expected !== undefined,
    );
    const organization = expected!;
    TestValidator.equals("summary id matches", summary.id, organization.id);
    TestValidator.equals(
      "summary name matches",
      summary.name,
      organization.name,
    );
    TestValidator.equals(
      "summary description matches",
      summary.description,
      organization.description,
    );
    TestValidator.equals(
      "summary logo_uri matches",
      summary.logo_uri,
      organization.logo_uri,
    );
    TestValidator.equals(
      "summary currency_code matches",
      summary.currency_code,
      organization.currency_code,
    );
    TestValidator.equals(
      "summary timezone matches",
      summary.timezone,
      organization.timezone,
    );
    TestValidator.equals(
      "summary fiscal_start_month matches",
      summary.fiscal_start_month,
      organization.fiscal_start_month,
    );
    TestValidator.equals(
      "summary created_at matches",
      summary.created_at,
      organization.created_at,
    );
    TestValidator.equals(
      "summary updated_at matches",
      summary.updated_at,
      organization.updated_at,
    );
  });
  TestValidator.predicate(
    "distractor organization is excluded by filters",
    firstPage.data.every((summary) => summary.id !== distractor.id),
  );
  TestValidator.equals(
    "repeated call current page stable",
    secondPage.pagination.current,
    firstPage.pagination.current,
  );
  TestValidator.equals(
    "repeated call limit stable",
    secondPage.pagination.limit,
    firstPage.pagination.limit,
  );
  TestValidator.equals(
    "repeated call record count stable",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "repeated call page count stable",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "repeated call ordered ids stable",
    secondPage.data.map((summary) => summary.id),
    firstPage.data.map((summary) => summary.id),
  );
}
