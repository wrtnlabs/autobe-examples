import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_list_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // Step 2: Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: authResponse.token.access,
  };
  // Step 3: Query with random member_id that has no password reset history
  const randomNonExistentMemberId = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyResultRequest: IHrmPlatformMemberPasswordReset.IRequest = {
    member_id: randomNonExistentMemberId,
    limit: 20,
  } satisfies IHrmPlatformMemberPasswordReset.IRequest;
  const noResultsResponse =
    await api.functional.hrmPlatform.member.password_resets.index(
      memberConnection,
      {
        body: emptyResultRequest,
      },
    );
  typia.assert(noResultsResponse);
  // Step 4: Validate empty data array
  TestValidator.equals(
    "data array is empty for non-existent member",
    noResultsResponse.data,
    [],
  );
  // Step 5: Validate pagination metadata for empty results
  TestValidator.equals(
    "current page is 1 for empty results",
    noResultsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request for empty results",
    noResultsResponse.pagination.limit,
    emptyResultRequest.limit!,
  );
  TestValidator.equals(
    "records is 0 for empty results",
    noResultsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 for empty results",
    noResultsResponse.pagination.pages,
    0,
  );
  // Step 6: Query with future date range that won't match any tokens
  const futureDate = new Date(
    new Date().getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureDateRequest: IHrmPlatformMemberPasswordReset.IRequest = {
    created_after: futureDate,
    limit: 10,
  } satisfies IHrmPlatformMemberPasswordReset.IRequest;
  const futureDateResponse =
    await api.functional.hrmPlatform.member.password_resets.index(
      memberConnection,
      {
        body: futureDateRequest,
      },
    );
  typia.assert(futureDateResponse);
  // Step 7: Validate future date query returns empty results
  TestValidator.equals(
    "data array is empty for future date range",
    futureDateResponse.data,
    [],
  );
  TestValidator.equals(
    "records is 0 for future date range",
    futureDateResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 for future date range",
    futureDateResponse.pagination.pages,
    0,
  );
  // Step 8: Test with invalid date range (created_before < created_after)
  const invalidDateRequest: IHrmPlatformMemberPasswordReset.IRequest = {
    created_after: futureDate,
    created_before: new Date(
      new Date().getTime() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    limit: 15,
  } satisfies IHrmPlatformMemberPasswordReset.IRequest;
  const invalidDateResponse =
    await api.functional.hrmPlatform.member.password_resets.index(
      memberConnection,
      {
        body: invalidDateRequest,
      },
    );
  typia.assert(invalidDateResponse);
  TestValidator.equals(
    "invalid date range returns empty data",
    invalidDateResponse.data,
    [],
  );
  TestValidator.equals(
    "invalid date range has 0 records",
    invalidDateResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid date range has 0 pages",
    invalidDateResponse.pagination.pages,
    0,
  );
}
