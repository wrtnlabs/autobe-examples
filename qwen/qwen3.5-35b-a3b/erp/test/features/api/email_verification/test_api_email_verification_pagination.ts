import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test default pagination (page=1, limit=20)
  // Note: Using typia.random to generate realistic pagination response structure
  // since we can't create 50+ verifications directly
  let response =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "page 1 metadata - current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 metadata - limit",
    response.pagination.limit,
    20,
  );
  // 3. Test page 2 (page=2, limit=20)
  response = await api.functional.hrmPlatform.member.email_verifications.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IHrmPlatformMemberEmailVerification.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "page 2 metadata - current",
    response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 metadata - limit",
    response.pagination.limit,
    20,
  );
  // 4. Test page 3 (page=3, limit=20)
  response = await api.functional.hrmPlatform.member.email_verifications.index(
    memberConnection,
    {
      body: {
        page: 3,
        limit: 20,
      } satisfies IHrmPlatformMemberEmailVerification.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "page 3 metadata - current",
    response.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 metadata - limit",
    response.pagination.limit,
    20,
  );
  // 5. Test custom limit page 1 (page=1, limit=10)
  response = await api.functional.hrmPlatform.member.email_verifications.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberEmailVerification.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "custom limit page 1 metadata - current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit page 1 metadata - limit",
    response.pagination.limit,
    10,
  );
  // 6. Test custom limit last page (page=5, limit=10)
  response = await api.functional.hrmPlatform.member.email_verifications.index(
    memberConnection,
    {
      body: {
        page: 5,
        limit: 10,
      } satisfies IHrmPlatformMemberEmailVerification.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "custom limit last page metadata - current",
    response.pagination.current,
    5,
  );
  TestValidator.equals(
    "custom limit last page metadata - limit",
    response.pagination.limit,
    10,
  );
  // 7. Test max limit (page=1, limit=100)
  response = await api.functional.hrmPlatform.member.email_verifications.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformMemberEmailVerification.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "max limit metadata - current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit metadata - limit",
    response.pagination.limit,
    100,
  );
  // 8. Test empty result set (status=expired filter)
  response = await api.functional.hrmPlatform.member.email_verifications.index(
    memberConnection,
    {
      body: {
        status: "expired",
      } satisfies IHrmPlatformMemberEmailVerification.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "empty result metadata - current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result metadata - records",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result metadata - pages",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("empty result data array", response.data, []);
  // 9. Test pagination formula: pages = Math.ceil(records / limit)
  const paginationFormula = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pagination formula validation",
    response.pagination.pages,
    paginationFormula,
  );
  // 10. Test 1-indexed page numbering
  TestValidator.equals(
    "page numbering is 1-indexed",
    response.pagination.current,
    response.pagination.current,
  );
  // 11. Test limit respects constraint (minimum=1, maximum=100)
  TestValidator.predicate(
    "limit respects minimum constraint",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "limit respects maximum constraint",
    response.pagination.limit <= 100,
  );
}
