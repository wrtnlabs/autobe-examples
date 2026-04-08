import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization list pagination and sorting capabilities.
 *
 * Validates the complete pagination and sorting functionality for organization list retrieval. The member creates multiple organizations, then queries with various pagination and sorting parameters to ensure correct behavior across all scenarios.
 *
 * 1. Member authenticates and creates 7 organizations with distinct names.
 * 2. Validates default pagination returns all organizations sorted by created_at descending.
 * 3. Tests take parameter controls page size (5, 3, 1 records per page).
 * 4. Tests skip parameter for cursor-based pagination navigation.
 * 5. Tests page parameter for page-number-based pagination.
 * 6. Validates sorting by name field in ascending and descending order.
 * 7. Validates sorting by created_at field in both directions.
 * 8. Validates sorting by updated_at field.
 * 9. Tests requesting page beyond available data returns empty array with valid metadata.
 * 10. Validates pagination metadata accuracy (total records, current page, total pages).
 */
export async function test_api_organization_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create 7 organizations for pagination testing
  for (let i = 0; i < 7; i++) {
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `TestOrg_${String.fromCharCode(65 + i)}_${RandomGenerator.alphabets(4)}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  }
  // 3. Test default pagination (should return all orgs, sorted by created_at desc)
  const defaultResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          take: 100,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default returns all orgs",
    defaultResult.data.length,
    7,
  );
  TestValidator.equals(
    "default pagination records",
    defaultResult.pagination.records,
    7,
  );
  TestValidator.equals(
    "default pagination pages",
    defaultResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "default pagination current",
    defaultResult.pagination.current,
    1,
  );
  // 4. Test take parameter with different values
  const take5Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          take: 5,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(take5Result);
  TestValidator.equals("take 5 returns 5 orgs", take5Result.data.length, 5);
  TestValidator.equals(
    "take 5 limit in metadata",
    take5Result.pagination.limit,
    5,
  );
  const take3Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          take: 3,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(take3Result);
  TestValidator.equals("take 3 returns 3 orgs", take3Result.data.length, 3);
  TestValidator.equals(
    "take 3 pages calculated",
    take3Result.pagination.pages,
    3,
  );
  // 5. Test skip parameter for cursor-based pagination
  const skip0Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          take: 3,
          skip: 0,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(skip0Result);
  TestValidator.equals("skip 0 first page data", skip0Result.data.length, 3);
  const skip3Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          take: 3,
          skip: 3,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(skip3Result);
  TestValidator.equals("skip 3 second page", skip3Result.data.length, 3);
  const skip6Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          take: 3,
          skip: 6,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(skip6Result);
  TestValidator.equals("skip 6 last org", skip6Result.data.length, 1);
  // 6. Test page parameter for page-number-based pagination
  const page1Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  const page2Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 data count", page2Result.data.length, 3);
  const page3Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 3,
          limit: 3,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals("page 3 last page", page3Result.data.length, 1);
  // 7. Test page beyond available data
  const page10Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 10,
          limit: 3,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(page10Result);
  TestValidator.equals("page 10 empty array", page10Result.data.length, 0);
  TestValidator.equals(
    "page 10 valid metadata records",
    page10Result.pagination.records,
    7,
  );
  // 8. Test sorting by name ascending
  const sortNameAscResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          sort: "name",
          order: "asc",
          take: 100,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(sortNameAscResult);
  for (let i = 1; i < sortNameAscResult.data.length; i++) {
    TestValidator.predicate(
      `name asc order ${i}`,
      sortNameAscResult.data[i - 1].name <= sortNameAscResult.data[i].name,
    );
  }
  // 9. Test sorting by name descending
  const sortNameDescResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          sort: "name",
          order: "desc",
          take: 100,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(sortNameDescResult);
  for (let i = 1; i < sortNameDescResult.data.length; i++) {
    TestValidator.predicate(
      `name desc order ${i}`,
      sortNameDescResult.data[i - 1].name >= sortNameDescResult.data[i].name,
    );
  }
  // 10. Test sorting by created_at descending
  const sortCreatedAtDescResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          take: 100,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(sortCreatedAtDescResult);
  for (let i = 1; i < sortCreatedAtDescResult.data.length; i++) {
    TestValidator.predicate(
      `created_at desc order ${i}`,
      new Date(sortCreatedAtDescResult.data[i - 1].created_at).getTime() >=
        new Date(sortCreatedAtDescResult.data[i].created_at).getTime(),
    );
  }
  // 11. Test sorting by created_at ascending
  const sortCreatedAtAscResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
          take: 100,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(sortCreatedAtAscResult);
  for (let i = 1; i < sortCreatedAtAscResult.data.length; i++) {
    TestValidator.predicate(
      `created_at asc order ${i}`,
      new Date(sortCreatedAtAscResult.data[i - 1].created_at).getTime() <=
        new Date(sortCreatedAtAscResult.data[i].created_at).getTime(),
    );
  }
  // 12. Test sorting by updated_at
  const sortUpdatedAtResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          sort: "updated_at",
          order: "desc",
          take: 100,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(sortUpdatedAtResult);
  // 13. Validate pagination metadata accuracy
  const metadataTest =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          take: 2,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(metadataTest);
  TestValidator.equals("metadata records", metadataTest.pagination.records, 7);
  TestValidator.equals("metadata limit", metadataTest.pagination.limit, 2);
  TestValidator.equals("metadata pages", metadataTest.pagination.pages, 4);
  TestValidator.equals("metadata current", metadataTest.pagination.current, 1);
}
