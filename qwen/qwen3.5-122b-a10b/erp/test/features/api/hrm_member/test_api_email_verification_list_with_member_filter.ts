import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_list_with_member_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Call email verification listing endpoint with member_id filter
  const result: IPageIHrmMemberEmailVerification.ISummary =
    await api.functional.hrm.member.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: auth.id,
        } satisfies IHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination structure exists
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  // 4. Validate data array is present
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. Validate each verification record belongs to the filtered member
  for (const verification of result.data) {
    typia.assert(verification);
    // Business logic validation: member_id must match the filter
    TestValidator.equals(
      "member matches filter",
      verification.member.id,
      auth.id,
    );
  }
  // 6. Validate pagination metadata values
  TestValidator.predicate(
    "current page is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 7. Validate record count matches data array length
  TestValidator.equals(
    "data array length matches records",
    result.data.length,
    result.pagination.records,
  );
}
