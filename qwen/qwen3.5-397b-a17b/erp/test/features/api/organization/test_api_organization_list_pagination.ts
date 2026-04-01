import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_organization_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test default pagination (no page/limit parameters)
  const defaultResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default pagination has metadata",
    defaultResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "default pagination has data array",
    Array.isArray(defaultResult.data),
  );
  TestValidator.predicate(
    "default limit is positive",
    defaultResult.pagination.limit > 0,
  );
  // 3. Test custom limit (within 1-100 range)
  const customLimit = 5;
  const limitResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          limit: customLimit,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(limitResult);
  TestValidator.equals(
    "limit respected",
    limitResult.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data count within limit",
    limitResult.data.length <= customLimit,
  );
  // 4. Test page navigation with consistent limit
  const pageLimit = 3;
  const page1Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, pageLimit);
  const page2Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: pageLimit,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, pageLimit);
  // 5. Test pagination metadata accuracy
  const expectedPages = Math.ceil(
    page1Result.pagination.records / page1Result.pagination.limit,
  );
  TestValidator.equals(
    "pages calculated correctly",
    page1Result.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "records consistent across pages",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
  // 6. Test page beyond available pages returns empty data
  const largePageResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.equals(
    "empty data for out-of-range page",
    largePageResult.data.length,
    0,
  );
  TestValidator.equals(
    "metadata current page preserved",
    largePageResult.pagination.current,
    9999,
  );
  TestValidator.predicate(
    "metadata pages still accurate",
    largePageResult.pagination.pages >= 0,
  );
}
